from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from app.textSummarize import PdfSummarizer

app = FastAPI()

# Allow CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # TODO: CHANGE -> RIGHT NOW FOR DEVELOPMENT ONLY
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize Summarizer (you can make this dynamic if needed)
summarizer = PdfSummarizer()

@app.post("/summarize")
async def summarize_pdf_endpoint(
    file: UploadFile = File(...),
    detailed: bool = Form(False)
):
    try:
        # Save uploaded PDF temporarily
        pdf_path = f"app/uploads/{file.filename}"
        with open(pdf_path, "wb") as f:
            f.write(await file.read())
        
        # Run summarization
        summary = summarizer.summarize_pdf(pdf_path, detailed=detailed)

        # Clean up
        os.remove(pdf_path)

        return JSONResponse(content={"summary": summary})
    
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
