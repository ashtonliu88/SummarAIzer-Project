from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from gtts import gTTS
from app.textSummarize import PdfSummarizer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

summarizer = PdfSummarizer()

AUDIO_FOLDER = "app/generated_audios"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.post("/summarize")
async def summarize_pdf_endpoint(
    file: UploadFile = File(...),
    detailed: bool = Form(False)
):
    try:
        pdf_path = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(pdf_path, "wb") as f:
            f.write(await file.read())
        
        summary = summarizer.summarize_pdf(pdf_path, detailed=False) # Detailed is hard coded right now, TODO: change
        os.remove(pdf_path)

        return JSONResponse(content={"summary": summary})
    
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
