from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from textSummarize import PdfSummarizer
import requests
import os, uuid, pathlib
from gtts import gTTS
from routers import align_router
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(align_router.router) 

BASE = pathlib.Path(__file__).parent
UPLOAD_FOLDER   = BASE / "uploads"
AUDIO_FOLDER    = BASE / "generated_audios"
for p in (UPLOAD_FOLDER, AUDIO_FOLDER):
    p.mkdir(exist_ok=True)

summarizer = PdfSummarizer()

def extract_title_from_reference(ref):
    """Extract potential title from a reference string."""
    try:
        if not ref or len(ref) < 15:
            return None
            
        # For numbered references like [1] Title...
        if '[' in ref and ']' in ref:
            parts = ref.split(']', 1)
            if len(parts) > 1:
                title_part = parts[1].strip()
                # Try to find the title - usually the first part before a period
                if '.' in title_part:
                    return title_part.split('.')[0].strip()
                else:
                    # If no period, use a reasonable length for the title
                    return title_part[:min(100, len(title_part))].strip()
        
        # For author-year references
        elif '(' in ref and ')' in ref:
            parts = ref.split(')', 1)
            if len(parts) > 1:
                title_part = parts[1].strip()
                if title_part.startswith('.'):
                    title_part = title_part[1:].strip()
                if '.' in title_part:
                    return title_part.split('.')[0].strip()
                else:
                    return title_part[:min(100, len(title_part))].strip()
        
        # Default: take first part until first period or a reasonable length
        else:
            if '.' in ref:
                title_candidate = ref.split('.')[0].strip()
                # Check if the title is meaningful (not just an author name)
                if len(title_candidate) > 15:
                    return title_candidate
            
            # If we can't find a good title, look for a chunk with at least some words
            words = ref.split()
            if len(words) >= 5:
                return ' '.join(words[:10])  # Use first 10 words
        
        return None
        
    except Exception as e:
        print(f"Error extracting title: {e}")
        return None

def search_papers_by_title(title, limit=5):
    """
    Search for papers using the Semantic Scholar API by title.
    
    Args:
        title: Paper title to search for
        limit: Maximum number of results to return
        
    Returns:
        List of paper dictionaries with metadata
    """
    try:
        if not title or len(title) < 10:
            return []
            
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": title,
            "limit": limit,
            "fields": "title,authors,year,abstract,url,venue,citationCount"
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)  # Add timeout
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as req_error:
            print(f"API request error: {req_error}")
            return []  # Return empty list on API request error
        
        results = []
        for paper in data.get("data", []):
            try:
                # Format authors
                authors = paper.get("authors", [])
                author_names = [author.get("name", "") for author in authors if author.get("name")]
                author_text = ", ".join(author_names[:3])
                if len(author_names) > 3:
                    author_text += " et al."
                    
                # Create formatted paper entry
                formatted = {
                    "title": paper.get("title", "Untitled"),
                    "authors": author_text,
                    "year": paper.get("year"),
                    "abstract": paper.get("abstract", "").split(". ")[0] + "..." if paper.get("abstract") else "",
                    "url": paper.get("url", ""),
                    "venue": paper.get("venue", ""),
                    "citationCount": paper.get("citationCount", 0)
                }
                
                results.append(formatted)
            except Exception as paper_error:
                print(f"Error formatting paper data: {paper_error}")
                continue
        
        return results
    except Exception as e:
        print(f"Error searching papers by title: {e}")
        return []

def get_related_papers(references, limit=5):
    """
    Get related papers based on extracted references.
    Uses Semantic Scholar API to find related papers.
    
    Args:
        references: List of reference strings
        limit: Maximum number of related papers to return
        
    Returns:
        List of paper dictionaries with metadata
    """
    try:
        if not references:
            return []
            
        related_papers = []
        seen_papers = set()
        
        # Select a good sample of references to search for related papers
        reference_sample = []
        
        # Include some references from the beginning, middle, and end
        if len(references) <= 10:
            reference_sample = references
        else:
            # Get 2 from beginning, 2 from middle, 2 from end
            reference_sample.extend(references[:2])
            reference_sample.extend(references[len(references)//2:len(references)//2+2])
            reference_sample.extend(references[-2:])
        
        # Process each reference to find related papers
        for ref in reference_sample:
            try:
                # Extract potential title from reference
                title = extract_title_from_reference(ref)
                if not title or len(title) < 10:  # Skip if title is too short
                    continue
                    
                # Search for papers with similar title
                papers = search_papers_by_title(title, limit=2)
                for paper in papers:
                    # Avoid duplicates
                    if paper.get("title") in seen_papers:
                        continue
                        
                    seen_papers.add(paper.get("title"))
                    related_papers.append(paper)
                    
                    # If we have enough papers, stop
                    if len(related_papers) >= limit:
                        break
            except Exception as ref_error:
                print(f"Error processing reference: {ref_error}")
                continue
        
        return related_papers[:limit]
    except Exception as e:
        print(f"Error getting related papers: {e}")
        return []  # Return empty list on error

@app.post("/summarize")
async def summarize_pdf_endpoint(
    file: UploadFile = File(...),
    detailed: str = Form("false"),
    citations: bool = Form(False)
):
    try:
        pdf_path = UPLOAD_FOLDER / file.filename
        pdf_path.write_bytes(await file.read())
        
        summary = summarizer.summarize_pdf(pdf_path, detailed=detailed)
        txt_name = f"{pdf_path.stem}.txt"
        txt_path = UPLOAD_FOLDER / txt_name
        txt_path.write_text(summary, encoding="utf-8")

        return JSONResponse(
            {
                "summary": summary,
                "text_name": txt_name
            }
        )
    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

class AudioRequest(BaseModel):
    summary: str | None = None
    text_name: str | None = None

@app.post("/generate-audio")
async def generate_audio(req: AudioRequest):
    summary   = req.summary
    text_name = req.text_name

    if text_name:
        txt_path = UPLOAD_FOLDER / text_name
        if not txt_path.exists():
            raise HTTPException(404, "summary file not found on server")
        summary = txt_path.read_text(encoding="utf-8")
        stem = pathlib.Path(text_name).stem
        audio_name = f"{stem}.mp3"
    elif summary:
        audio_name = f"{uuid.uuid4()}.mp3"
    else:
        raise HTTPException(400, "Need either summary string or text_name.")

    audio_path = AUDIO_FOLDER / audio_name
    gTTS(text=summary).save(audio_path)
    return {"audio_url": f"/audio/{audio_name}", "audio_name": audio_name}


@app.get("/audio/{filename}")
async def get_audio(filename: str):
    filepath = AUDIO_FOLDER / filename
    if filepath.exists():
        return FileResponse(filepath, media_type="audio/mpeg")
    return JSONResponse({"error": "File not found"}, status_code=404)
