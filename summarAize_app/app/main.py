from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from gtts import gTTS
from app.textSummarize import PdfSummarizer
from fastapi.staticfiles import StaticFiles
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

summarizer = PdfSummarizer()

AUDIO_FOLDER = "generated_audios"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

IMAGE_FOLDER = "app/images"
os.makedirs(IMAGE_FOLDER, exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGE_FOLDER), name="images")

def generate_index(image_folder: str):
    files = sorted(
        f for f in os.listdir(image_folder) if f.lower().endswith((".png", ".jpg", ".jpeg"))
    )
    index_path = os.path.join(image_folder, "index.json")
    with open(index_path, "w") as f:
        json.dump(files, f)

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
    
@app.get("/images/index.json")
async def get_image_index():
    generate_index(IMAGE_FOLDER)
    index_path = os.path.join(IMAGE_FOLDER, "index.json")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="application/json")
    return JSONResponse(content={"error": "Index not found"}, status_code=404)
