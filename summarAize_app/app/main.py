from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

from typing import List, Dict, Optional
from pydantic import BaseModel
import os, uuid, pathlib
from gtts import gTTS
from textSummarize import PdfSummarizer
from chatbot import SummaryRefiner
import requests
from routers import align_router
from auth import get_current_user, UserInfo


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

class AudioRequest(BaseModel):
    summary: Optional[str] = None
    text_name: Optional[str] = None


@app.post("/summarize")
async def summarize_pdf_endpoint(
    file: UploadFile = File(...),
    detailed: str = Form("false"),
    citations: str = Form("false"),
    current_user: Optional[UserInfo] = None  # Made optional to allow anonymous usage
):
    try:
        # Convert string values to booleans
        is_detailed = detailed.lower() == "true"
        include_citations = citations.lower() == "true"
        
        # Create temporary file path
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        
        # Save the uploaded file
        with open(file_path, 'wb') as f:
            f.write(await file.read())
        
        # Process the PDF
        summary = summarizer.summarize_pdf(
            file_path, 
            chunk_method="sentence",
            parallel=True,
            detailed=is_detailed,
            include_citations=include_citations
        )
        
        # Extract keywords if available
        keywords = []
        try:
            # Read the file again since it might have been processed
            with open(file_path, 'rb') as f:
                text = summarizer.extract_text_from_pdf(file_path)
                keywords = summarizer.extract_keywords(text)
        except Exception as e:
            print(f"Error extracting keywords: {str(e)}")
        
        # Get references
        references = summarizer.extracted_references if hasattr(summarizer, 'extracted_references') else []
        
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)

        return JSONResponse(content={
            "summary": summary, 
            "references": references,
            "referenceCount": len(references),
            "hasCitations": include_citations,
            "keywords": keywords
        })
    
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/generate-audio")
async def generate_audio(req: AudioRequest):
    summary   = req.summary
    text_name = req.text_name

    if text_name:
        txt_path = os.path.join(UPLOAD_FOLDER, text_name)
        if not os.path.exists(txt_path):
            raise HTTPException(404, "summary file not found on server")
        with open(txt_path, 'r', encoding='utf-8') as f:
            summary = f.read()
        stem = pathlib.Path(text_name).stem
        audio_name = f"{stem}.mp3"
    elif summary:
        audio_name = f"{uuid.uuid4()}.mp3"
    else:
        raise HTTPException(400, "Need either summary string or text_name.")

    audio_path = os.path.join(AUDIO_FOLDER, audio_name)
    gTTS(text=summary).save(audio_path)
    return {"audio_url": f"/audio/{audio_name}", "audio_name": audio_name}


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

class QuestionRequest(BaseModel):
    summary: str
    user_question: str
    chat_history: Optional[List[Dict[str, str]]] = None
    references: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

@app.post("/answer-question")
async def answer_question_endpoint(request: QuestionRequest):
    try:
        result = chatbot.answer_question(
            summary=request.summary,
            user_question=request.user_question,
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

# User authentication endpoints
@app.get("/auth/me")
async def get_user_info(current_user: UserInfo = Depends(get_current_user)):
    """
    Get the current authenticated user information.
    """
    return current_user

class UserPreference(BaseModel):
    """User preferences model"""
    difficulty_level: Optional[str] = None
    include_citations: Optional[bool] = None
    theme: Optional[str] = None

@app.post("/auth/preferences")
async def update_user_preferences(
    preferences: UserPreference,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Update user preferences. In a production environment, these would be stored in a database.
    """
    # In a real implementation, we would store these preferences in a database
    # For now, we'll just return them back
    return {
        "user_id": current_user.uid,
        "preferences": preferences.dict(),
        "success": True
    }

@app.get("/auth/verify-token")
async def verify_token_endpoint(current_user: UserInfo = Depends(get_current_user)):
    """
    Verify if the user's token is valid
    """
    return {"valid": True, "user": current_user}

# User library endpoints
class SavedSummary(BaseModel):
    """Model for saved summary metadata"""
    id: str
    title: str
    date_created: str
    summary: str
    references: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

@app.get("/user/library")
async def get_user_library(current_user: UserInfo = Depends(get_current_user)):
    """
    Get user's saved summaries. In a production environment, these would be retrieved from a database.
    """
    # In a real implementation, we would fetch the user's library from a database
    # For now, we'll just return an empty array or mock data
    
    # Sample mock data for demonstration purposes
    mock_library = [
        {
            "id": "1",
            "title": "Artificial Intelligence in Healthcare",
            "date_created": "2025-05-25T10:30:00Z",
            "summary_preview": "AI is revolutionizing healthcare by improving diagnostics...",
        },
        {
            "id": "2",
            "title": "Climate Change Impact on Marine Ecosystems",
            "date_created": "2025-05-20T14:45:00Z",
            "summary_preview": "Rising ocean temperatures are causing significant disruptions...",
        }
    ]
    
    return {
        "user_id": current_user.uid,
        "summaries": mock_library
    }

@app.post("/user/library")
async def save_to_library(
    summary: SavedSummary,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Save a summary to the user's library. In a production environment, this would be stored in a database.
    """
    # In a real implementation, we would store this in a database
    return {
        "success": True,
        "summary_id": summary.id,
        "message": "Summary saved to library"
    }
