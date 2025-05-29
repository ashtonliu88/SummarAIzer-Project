from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
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
        pdf_path = UPLOAD_FOLDER / file.filename
        pdf_path.write_bytes(await file.read())
        
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
