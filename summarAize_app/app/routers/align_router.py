from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import shutil, tempfile

from services.aligner import align

router = APIRouter()

UPLOADS  = Path(__file__).resolve().parent.parent / "uploads"
AUDIO    = Path(__file__).resolve().parent.parent / "generated_audios"
UPLOADS.mkdir(exist_ok=True)
AUDIO.mkdir(exist_ok=True)

@router.post("/align")
async def align_endpoint(
    # upload both files now
    audio: UploadFile | None = File(None),
    transcript: UploadFile | None = File(None),
    # refer to existing filenames
    audio_name: str | None = Form(None),
    text_name: str | None  = Form(None),
    lang: str = Form("eng")
):
    # -------- resolve paths ----------
    if audio and transcript:
        with tempfile.NamedTemporaryFile(delete=False, dir=AUDIO) as a:
            shutil.copyfileobj(audio.file, a)
            audio_path = Path(a.name)
        with tempfile.NamedTemporaryFile(delete=False, dir=UPLOADS) as t:
            shutil.copyfileobj(transcript.file, t)
            text_path = Path(t.name)

    elif audio_name and text_name:
        audio_path = AUDIO / audio_name
        text_path  = UPLOADS / text_name
        if not audio_path.exists() or not text_path.exists():
            raise HTTPException(404, "Provided filenames not found on server.")
    else:
        raise HTTPException(400, "Must upload files or give filenames.")

    # -------- run aeneas ----------
    try:
        json_path = align(audio_path, text_path, lang)
    except Exception as e:
        raise HTTPException(500, f"Aeneas failed: {e}")

    return FileResponse(json_path, media_type="application/json")
