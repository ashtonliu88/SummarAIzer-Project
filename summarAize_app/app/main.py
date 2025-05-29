from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from pydantic import BaseModel
import os
import uuid
from gtts import gTTS
from textSummarize import PdfSummarizer
from chatbot import SummaryRefiner

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

summarizer = PdfSummarizer()
chatbot = SummaryRefiner()

AUDIO_FOLDER = "generated_audios"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.post("/summarize")
async def summarize_pdf_endpoint(
    file: UploadFile = File(...),
    detailed: str = Form("false"),
    citations: bool = Form(False)
):
    try:
        pdf_path = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(pdf_path, "wb") as f:
            f.write(await file.read())
        
        # First extract text from the PDF
        text = summarizer.extract_text_from_pdf(pdf_path)
        
        # Extract references and keywords
        references = summarizer.extract_references(text)
        keywords = summarizer.extract_keywords(text)
        print(f"Found {len(references)} references and {len(keywords)} keywords in the document")
        
        # Convert detailed string to boolean
        is_detailed = detailed.lower() == "true"
        
        # Generate summary with citations if requested
        summary = summarizer.summarize_pdf(
            pdf_path, 
            detailed=is_detailed,
            include_citations=citations
        )
        
        # Clean up uploaded file
        os.remove(pdf_path)

        return JSONResponse(content={
            "summary": summary, 
            "references": references,
            "referenceCount": len(references),
            "hasCitations": citations,
            "keywords": keywords
        })
    
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/generate-audio")
async def generate_audio(summary: str = Body(...)):
    try:
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_FOLDER, filename)

        tts = gTTS(text=summary)
        tts.save(filepath)

        return {"audio_url": f"http://127.0.0.1:8000/audio/{filename}"}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    filepath = os.path.join(AUDIO_FOLDER, filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, media_type="audio/mpeg")
    else:
        return JSONResponse(content={"error": "File not found"}, status_code=404)

class ChatRequest(BaseModel):
    summary: str
    user_message: str
    chat_history: Optional[List[Dict[str, str]]] = None
    references: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        result = chatbot.refine_summary(
            original_summary=request.summary,
            user_request=request.user_message,
            chat_history=request.chat_history,
            references=request.references,
            keywords=request.keywords
        )
        
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(
            content={"error": str(e), "success": False},
            status_code=500
        )
