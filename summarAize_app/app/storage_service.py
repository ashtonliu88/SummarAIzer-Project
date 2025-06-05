"""
Firebase Storage Service for user-specific video management
"""
import os
from datetime import datetime
from typing import List, Dict, Optional
import firebase_admin
from firebase_admin import storage
from pathlib import Path
import mimetypes
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class FirebaseStorageService:
    """Service for managing user-specific video storage in Firebase"""
    
    def __init__(self):
        # Get the default app or use existing one
        try:
            self.app = firebase_admin.get_app()
        except ValueError:
            # App doesn't exist, check if it was initialized in auth.py
            try:
                # Try to initialize with the service account
                cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 
                                    os.path.join(os.path.dirname(__file__), 'credentials', 'firebase-service-account.json'))
                
                if os.path.exists(cred_path):
                    from firebase_admin import credentials
                    
                    # Get project ID and storage bucket from environment
                    project_id = os.getenv('FIREBASE_PROJECT_ID')
                    storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
                    
                    config = {}
                    if storage_bucket:
                        config['storageBucket'] = storage_bucket
                    
                    cred = credentials.Certificate(cred_path)
                    self.app = firebase_admin.initialize_app(cred, config)
                    print(f"Firebase Storage: Initialized with service account (bucket: {storage_bucket})")
                else:
                    print(f"Warning: Firebase service account not found at {cred_path}")
                    self.app = None
            except Exception as e:
                print(f"Warning: Firebase app not initialized for storage: {e}")
                self.app = None
        
        # Get storage bucket
        if self.app:
            try:
                # Get bucket name from environment or default
                storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
                if storage_bucket:
                    self.bucket = storage.bucket(storage_bucket)
                    print(f"Firebase Storage: Connected to bucket {storage_bucket}")
                else:
                    self.bucket = storage.bucket()
                    print("Firebase Storage: Connected to default bucket")
            except Exception as e:
                print(f"Warning: Failed to get storage bucket: {e}")
                self.bucket = None
        else:
            self.bucket = None
    
    def _get_user_video_path(self, user_id: str, video_name: str) -> str:
        """Generate the storage path for a user's video"""
        return f"users/{user_id}/videos/{video_name}"
    
    def upload_video(self, user_id: str, video_file_path: str, video_name: str = None) -> Dict[str, str]:
        """
        Upload a video file to Firebase Storage under user's folder
        
        Args:
            user_id: The user's ID
            video_file_path: Local path to the video file
            video_name: Optional custom name for the video
            
        Returns:
            Dict containing upload info including download URL
        """
        if not self.bucket:
            raise Exception("Firebase Storage not initialized")
        
        if not os.path.exists(video_file_path):
            raise FileNotFoundError(f"Video file not found: {video_file_path}")
        
        # Generate video name if not provided
        if not video_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            video_name = f"video_{timestamp}.mp4"
        
        # Ensure .mp4 extension
        if not video_name.endswith('.mp4'):
            video_name += '.mp4'
        
        # Create storage path
        storage_path = self._get_user_video_path(user_id, video_name)
        
        try:
            # Upload file to Firebase Storage
            blob = self.bucket.blob(storage_path)
            
            # Set content type
            content_type = mimetypes.guess_type(video_file_path)[0] or 'video/mp4'
            blob.upload_from_filename(video_file_path, content_type=content_type)
            
            # Make the blob publicly readable (with custom URL)
            blob.make_public()
            
            # Get download URL
            download_url = blob.public_url
            
            # Also create a signed URL for more security (optional)
            # signed_url = blob.generate_signed_url(expiration=datetime.now() + timedelta(hours=24))
            
            return {
                "storage_path": storage_path,
                "download_url": download_url,
                "video_name": video_name,
                "size": os.path.getsize(video_file_path),
                "uploaded_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Failed to upload video to Firebase Storage: {str(e)}")
    
    def get_user_videos(self, user_id: str) -> List[Dict[str, str]]:
        """
        Get list of all videos for a specific user
        
        Args:
            user_id: The user's ID
            
        Returns:
            List of video metadata
        """
        if not self.bucket:
            raise Exception("Firebase Storage not initialized")
        
        user_video_prefix = f"users/{user_id}/videos/"
        
        try:
            blobs = self.bucket.list_blobs(prefix=user_video_prefix)
            videos = []
            
            for blob in blobs:
                # Skip if it's a directory marker
                if blob.name.endswith('/'):
                    continue
                
                video_name = blob.name.split('/')[-1]  # Get filename
                
                videos.append({
                    "video_name": video_name,
                    "storage_path": blob.name,
                    "download_url": blob.public_url,
                    "size": blob.size,
                    "created_at": blob.time_created.isoformat() if blob.time_created else None,
                    "updated_at": blob.updated.isoformat() if blob.updated else None
                })
            
            return videos
            
        except Exception as e:
            raise Exception(f"Failed to get user videos: {str(e)}")
    
    def delete_user_video(self, user_id: str, video_name: str) -> bool:
        """
        Delete a specific video for a user
        
        Args:
            user_id: The user's ID
            video_name: Name of the video to delete
            
        Returns:
            True if deleted successfully
        """
        if not self.bucket:
            raise Exception("Firebase Storage not initialized")
        
        storage_path = self._get_user_video_path(user_id, video_name)
        
        try:
            blob = self.bucket.blob(storage_path)
            
            # Check if blob exists
            if not blob.exists():
                return False
            
            # Delete the blob
            blob.delete()
            return True
            
        except Exception as e:
            raise Exception(f"Failed to delete video: {str(e)}")
    
    def get_video_download_url(self, user_id: str, video_name: str) -> Optional[str]:
        """
        Get download URL for a specific user's video
        
        Args:
            user_id: The user's ID
            video_name: Name of the video
            
        Returns:
            Download URL or None if not found
        """
        if not self.bucket:
            raise Exception("Firebase Storage not initialized")
        
        storage_path = self._get_user_video_path(user_id, video_name)
        
        try:
            blob = self.bucket.blob(storage_path)
            
            if not blob.exists():
                return None
            
            return blob.public_url
            
        except Exception as e:
            raise Exception(f"Failed to get video download URL: {str(e)}")


# Global instance
storage_service = FirebaseStorageService()
