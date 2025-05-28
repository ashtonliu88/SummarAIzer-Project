from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid

from gtts import gTTS
from textSummarize import PdfSummarizer
from imageExtract import extract_images

app = FastAPI()

# Enable CORS for all origins (development only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define base folders as Path objects
UPLOAD_FOLDER = Path("uploads")
IMAGE_FOLDER  = Path("images")
AUDIO_FOLDER  = Path("generated_audios")

# Create directories if they don't exist
for folder in (UPLOAD_FOLDER, IMAGE_FOLDER, AUDIO_FOLDER):
    folder.mkdir(parents=True, exist_ok=True)

# Mount static file serving for extracted images
app.mount(
    "/images", StaticFiles(directory=IMAGE_FOLDER),
    name="images"
)

# Initialize summarizer
summarizer = PdfSummarizer()

@app.post("/summarize")
async def summarize_pdf_endpoint(
    file: UploadFile = File(...),
    detailed: bool = Form(False)
):
    try:
        # 1) Save uploaded PDF under a unique subfolder
        pdf_id = uuid.uuid4().hex
        pdf_dir = UPLOAD_FOLDER / pdf_id
        pdf_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = pdf_dir / file.filename
        with open(pdf_path, "wb") as f:
            f.write(await file.read())

        # 2) Extract images into the shared images folder
        image_files = extract_images(str(pdf_path), str(IMAGE_FOLDER))

        # 3) Generate text summary
        summary = summarizer.summarize_pdf(str(pdf_path), detailed=detailed)

        # 4) Build public URLs for each image
        image_urls = [f"/images/{name}" for name in image_files]

        return JSONResponse({
            "summary": summary,
            "images": image_urls
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/generate-audio")
async def generate_audio(summary: str = Form(...)):
    try:
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = AUDIO_FOLDER / filename

        tts = gTTS(text=summary)
        tts.save(str(filepath))

        return {"audio_url": f"/audio/{filename}"}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    filepath = AUDIO_FOLDER / filename
    if filepath.exists():
        return FileResponse(str(filepath), media_type="audio/mpeg")
    return JSONResponse({"error": "File not found"}, status_code=404)
