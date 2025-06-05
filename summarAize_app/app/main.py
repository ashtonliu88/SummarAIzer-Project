from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException, Depends
from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from typing import List, Dict, Optional
from pydantic import BaseModel
from pathlib import Path
import os, uuid, pathlib, time
from gtts import gTTS
from textSummarize import PdfSummarizer
from extractVisuals import extract_visual_elements, generate_visuals_video
from imageExtract import extract_images
from chatbot import SummaryRefiner
import requests
from auth import get_current_user, UserInfo
from storage_service import storage_service

from services.aligner import align
# from services.related import get_related_papers
import re


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

UPLOAD_FOLDER = Path("uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

IMAGE_FOLDER  = Path("images")
os.makedirs(IMAGE_FOLDER, exist_ok=True)

VIDEO_FOLDER = Path("videos")
os.makedirs(VIDEO_FOLDER, exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGE_FOLDER),name="images")
class AudioRequest(BaseModel):
    summary: Optional[str] = None
    text_name: Optional[str] = None

def clean_pdf_text(text: str) -> str:
    # Remove page numbers like "\n12\n" or "12\n" or "\n12"
    text = re.sub(r'\n\d+\n', '\n', text)
    text = re.sub(r'\n\d+\s', '\n', text)
    text = re.sub(r'\s\d+\n', '\n', text)

    # Remove stray control characters
    text = re.sub(r'[\x00-\x1F\x7F]', '', text)

    # Normalize multiple spaces/newlines
    text = re.sub(r'\s+', ' ', text)

    return text


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
        
        # Process the PDF to generate summary
        summary = summarizer.summarize_pdf(
            file_path, 
            chunk_method="sentence",
            parallel=True,
            detailed=is_detailed,
            include_citations=include_citations
        )

        #extracting images
        image_files = extract_images(str(file_path), str(IMAGE_FOLDER))
        image_urls = [f"/images/{name}" for name in image_files]
        
        # Extract keywords & references from cleaned text
        keywords = []
        references = []

        try:
            with open(file_path, 'rb') as f:
                raw_text = summarizer.extract_text_from_pdf(file_path)
                clean_text = clean_pdf_text(raw_text)

                keywords = summarizer.extract_keywords(clean_text)
                references = summarizer.extract_references(clean_text)

                # Optional: Debug print
                print(f"[DEBUG] Extracted {len(references)} references")
        
        except Exception as e:
            print(f"[!] Error extracting keywords/references: {str(e)}")
        
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
        print(f"[!] Error in /summarize: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

    
@app.post("/generate-visuals-video")
async def generate_visuals_video_endpoint(file: UploadFile = File(...)):
    try:
        # Save uploaded PDF
        pdf_id = str(uuid.uuid4())
        pdf_filename = f"{pdf_id}.pdf"
        pdf_path = UPLOAD_FOLDER / pdf_filename

        with open(pdf_path, "wb") as f:
            f.write(await file.read())

        print(f"[✓] Saved PDF: {pdf_path}")

        # Extract visuals
        visuals_folder = VIDEO_FOLDER / f"{pdf_id}_visuals"
        visuals_folder.mkdir(exist_ok=True)

        try:
            extract_visual_elements(str(pdf_path), str(visuals_folder))
        except Exception as extract_error:
            print(f"[!] Error extracting visuals: {extract_error}")
            return JSONResponse(content={"error": f"Failed to extract visuals: {str(extract_error)}"}, status_code=500)

        # Generate video
        video_filename = f"{pdf_id}_walkthrough.mp4"
        video_path = VIDEO_FOLDER / video_filename

        try:
            generate_visuals_video(str(visuals_folder), str(video_path))
        except Exception as video_error:
            print(f"[!] Error generating video: {video_error}")
            return JSONResponse(content={"error": f"Failed to generate video: {str(video_error)}"}, status_code=500)

        print(f"[✓] Video generated: {video_path}")

        return {
            "video_url": f"/video/{video_filename}",
            "video_name": video_filename
        }

    except Exception as e:
        print(f"[!] Error in /generate-visuals-video: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)
    
@app.get("/video/{filename}")
async def get_video(filename: str):
    video_path = VIDEO_FOLDER / filename
    if video_path.exists():
        return FileResponse(str(video_path), media_type="video/mp4")
    else:
        return JSONResponse(content={"error": "Video not found"}, status_code=404)



class AudioRequest(BaseModel):
    summary: str | None = None
    text_name: str | None = None
    stem: str | None = None

@app.post("/generate-audio")
async def generate_audio(req: AudioRequest):
    try:
        summary = req.summary
        text_name = req.text_name

        # Validate input
        if not summary and not text_name:
            raise HTTPException(400, "Need either summary string or text_name.")
        
        if not summary:  # If no summary provided, read from text file
            if text_name:
                txt_path = os.path.join(UPLOAD_FOLDER, text_name)
                if not os.path.exists(txt_path):
                    raise HTTPException(404, "summary file not found on server")
                with open(txt_path, 'r', encoding='utf-8') as f:
                    summary = f.read()
                stem = pathlib.Path(text_name).stem
                audio_name = f"{stem}.mp3"
        else:  # Create text file from summary
            stem = str(uuid.uuid4())
            text_name = f"{stem}.txt"
            txt_path = UPLOAD_FOLDER / text_name
            txt_path.write_text(summary, encoding="utf-8")
            audio_name = f"{stem}.mp3"

        # Validate summary content
        if not summary or len(summary.strip()) == 0:
            raise HTTPException(400, "Summary content is empty")
        
        # Limit summary length to prevent very long TTS requests
        if len(summary) > 5000:  # Limit to ~5000 characters
            print(f"[WARNING] Summary too long ({len(summary)} chars), truncating to 5000 chars")
            summary = summary[:5000] + "..."

        audio_path = os.path.join(AUDIO_FOLDER, audio_name)
        
        # Try to generate TTS with error handling and retries
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                print(f"[DEBUG] Attempting TTS generation (attempt {attempt + 1}/{max_retries})")
                
                # Create gTTS object with explicit language and slow=False for better reliability
                tts = gTTS(text=summary, lang='en', slow=False)
                tts.save(audio_path)
                
                # Verify the file was created and has content
                if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                    print(f"[✓] TTS generation successful on attempt {attempt + 1}")
                    break
                else:
                    raise Exception("Generated audio file is empty or corrupted")
                
            except Exception as e:
                error_msg = str(e)
                print(f"[!] TTS generation failed on attempt {attempt + 1}: {error_msg}")
                
                # Provide more specific error messages
                if "Failed to connect" in error_msg:
                    specific_error = "Cannot connect to Google TTS service. Please check your internet connection."
                elif "403" in error_msg or "Forbidden" in error_msg:
                    specific_error = "Google TTS service access denied. The service may be rate-limited."
                elif "502" in error_msg or "503" in error_msg:
                    specific_error = "Google TTS service is temporarily down."
                elif "timeout" in error_msg.lower():
                    specific_error = "Request to Google TTS service timed out."
                else:
                    specific_error = f"TTS generation error: {error_msg}"
                
                if attempt < max_retries - 1:
                    print(f"[DEBUG] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print(f"[!] TTS generation failed after {max_retries} attempts")
                    # Create a fallback response without audio
                    return JSONResponse(
                        content={
                            "error": "TTS service temporarily unavailable",
                            "audio_url": None,
                            "audio_name": None,
                            "text_name": text_name,
                            "align_file": None,
                            "message": specific_error,
                            "fallback": True,
                            "retry_after": 300  # Suggest retrying after 5 minutes
                        },
                        status_code=503  # Service Unavailable
                    )

        # Run alignment using imported function
        try:
            json_path = align(audio_path, txt_path, lang="eng")
            align_filename = json_path.name
            print(f"[✓] Alignment saved: {align_filename}")
        except Exception as e:
            print(f"[!] Alignment generation failed: {e}")
            align_filename = None

        return {
            "audio_url": f"/audio/{audio_name}",
            "audio_name": audio_name,
            "text_name": text_name,
            "align_file": align_filename
        }
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"[!] Unexpected error in generate_audio: {str(e)}")
        return JSONResponse(
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred while generating audio",
                "details": str(e)
            },
            status_code=500
        )


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

@app.post("/generate-visuals-video-auth")
async def generate_visuals_video_authenticated(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Generate video from PDF visuals and save to user's Firebase storage
    """
    start_time = time.time()
    
    try:
        # Save uploaded PDF
        pdf_id = str(uuid.uuid4())
        pdf_filename = f"{pdf_id}.pdf"
        pdf_path = UPLOAD_FOLDER / pdf_filename

        with open(pdf_path, "wb") as f:
            f.write(await file.read())

        print(f"[✓] Saved PDF: {pdf_path}")

        # Extract visuals
        visuals_folder = VIDEO_FOLDER / f"{pdf_id}_visuals"
        visuals_folder.mkdir(exist_ok=True)

        extract_time = time.time()
        try:
            extract_visual_elements(str(pdf_path), str(visuals_folder))
        except Exception as extract_error:
            print(f"[!] Error extracting visuals: {extract_error}")
            return JSONResponse(content={"error": f"Failed to extract visuals: {str(extract_error)}"}, status_code=500)

        extract_time = time.time() - extract_time
        print(f"[✓] Visual extraction completed in {extract_time:.2f}s")

        # Generate video
        video_filename = f"{current_user.uid}_{pdf_id}_walkthrough.mp4"
        video_path = VIDEO_FOLDER / video_filename

        video_time = time.time()
        try:
            generate_visuals_video(str(visuals_folder), str(video_path))
        except Exception as video_error:
            print(f"[!] Error generating video: {video_error}")
            return JSONResponse(content={"error": f"Failed to generate video: {str(video_error)}"}, status_code=500)

        video_time = time.time() - video_time
        print(f"[✓] Video generation completed in {video_time:.2f}s")

        # Upload to Firebase Storage
        firebase_url = None
        try:
            upload_result = storage_service.upload_video(
                user_id=current_user.uid,
                video_file_path=str(video_path),
                video_name=video_filename
            )
            firebase_url = upload_result["download_url"]
            print(f"[✓] Video uploaded to Firebase: {firebase_url}")
        except Exception as upload_error:
            print(f"[!] Error uploading to Firebase: {upload_error}")
            # Still return local video URL if Firebase fails
            firebase_url = None

        # Clean up temporary files
        try:
            os.remove(pdf_path)
            # Clean up visuals folder
            import shutil
            shutil.rmtree(visuals_folder, ignore_errors=True)
            # Keep local video for backup but could be cleaned up later
        except:
            pass

        total_time = time.time() - start_time
        print(f"[✓] Total video generation process completed in {total_time:.2f}s")

        return {
            "video_url": f"/video/{video_filename}",
            "video_name": video_filename,
            "firebase_url": firebase_url,
            "user_id": current_user.uid,
            "extract_time": extract_time,
            "video_time": video_time,
            "total_time": total_time
        }

    except Exception as e:
        total_time = time.time() - start_time
        print(f"[!] Error in /generate-visuals-video-auth: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/user-videos")
async def get_user_videos(current_user: UserInfo = Depends(get_current_user)):
    """
    Get list of all videos for the authenticated user
    """
    try:
        videos = storage_service.get_user_videos(current_user.uid)
        return {
            "user_id": current_user.uid,
            "videos": videos,
            "count": len(videos)
        }
    except Exception as e:
        print(f"[!] Error getting user videos: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.delete("/user-videos/{video_name}")
async def delete_user_video(
    video_name: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Delete a specific video for the authenticated user
    """
    try:
        success = storage_service.delete_user_video(current_user.uid, video_name)
        if success:
            return {
                "message": f"Video '{video_name}' deleted successfully",
                "video_name": video_name
            }
        else:
            return JSONResponse(
                content={"error": f"Video '{video_name}' not found"},
                status_code=404
            )
    except Exception as e:
        print(f"[!] Error deleting user video: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.get("/user-videos/{video_name}/download")
async def get_user_video_download_url(
    video_name: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Get download URL for a specific user's video
    """
    try:
        download_url = storage_service.get_video_download_url(current_user.uid, video_name)
        if download_url:
            return {
                "video_name": video_name,
                "download_url": download_url
            }
        else:
            return JSONResponse(
                content={"error": f"Video '{video_name}' not found"},
                status_code=404
            )
    except Exception as e:
        print(f"[!] Error getting video download URL: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/test-storage")
async def test_storage_endpoint(current_user: UserInfo = Depends(get_current_user)):
    """
    Test endpoint to verify Firebase Storage is working.
    """
    try:
        if not storage_service.bucket:
            return {"status": "error", "message": "Firebase Storage not initialized"}
        
        # Try to list user's videos
        videos = storage_service.get_user_videos(current_user.uid)
        
        return {
            "status": "success",
            "message": "Firebase Storage is working",
            "user_id": current_user.uid,
            "video_count": len(videos)
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Firebase Storage error: {str(e)}"
        }
