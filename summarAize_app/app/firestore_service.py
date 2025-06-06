"""
Firestore Service for video metadata management
"""
import os
from datetime import datetime
from typing import List, Dict, Optional
import firebase_admin
from firebase_admin import firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class FirestoreService:
    """Service for managing video metadata in Firestore"""
    
    def __init__(self):
        # Get the default app or use existing one
        try:
            self.app = firebase_admin.get_app()
        except ValueError:
            # App doesn't exist, initialize it
            try:
                cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 
                                    os.path.join(os.path.dirname(__file__), 'credentials', 'firebase-service-account.json'))
                
                if os.path.exists(cred_path):
                    from firebase_admin import credentials
                    
                    project_id = os.getenv('FIREBASE_PROJECT_ID')
                    storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
                    
                    config = {}
                    if storage_bucket:
                        config['storageBucket'] = storage_bucket
                    
                    cred = credentials.Certificate(cred_path)
                    self.app = firebase_admin.initialize_app(cred, config)
                    print(f"Firestore: Initialized with service account")
                else:
                    print(f"Warning: Firebase service account not found at {cred_path}")
                    self.app = None
            except Exception as e:
                print(f"Warning: Firebase app not initialized for Firestore: {e}")
                self.app = None
        
        # Get Firestore client
        if self.app:
            try:
                self.db = firestore.client()
                print("Firestore: Connected successfully")
            except Exception as e:
                print(f"Warning: Failed to get Firestore client: {e}")
                self.db = None
        else:
            self.db = None
    
    def save_video_metadata(self, user_id: str, video_data: Dict) -> str:
        """
        Save video metadata to Firestore
        
        Args:
            user_id: The user's ID
            video_data: Dictionary containing video metadata
            
        Returns:
            Document ID of the saved video metadata
        """
        if not self.db:
            raise Exception("Firestore not initialized")
        
        try:
            # Add timestamp and user_id to the data
            video_data.update({
                'user_id': user_id,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            })
            
            # Save to Firestore
            doc_ref = self.db.collection('user_videos').add(video_data)
            doc_id = doc_ref[1].id
            
            print(f"[DEBUG] Video metadata saved with ID: {doc_id}")
            return doc_id
            
        except Exception as e:
            raise Exception(f"Failed to save video metadata: {str(e)}")
    
    def get_user_videos(self, user_id: str) -> List[Dict]:
        """
        Get all video metadata for a specific user
        
        Args:
            user_id: The user's ID
            
        Returns:
            List of video metadata documents
        """
        if not self.db:
            print("Warning: Firestore not initialized, returning empty video list")
            return []
        
        try:
            videos_ref = self.db.collection('user_videos')
            query = videos_ref.where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING)
            
            videos = []
            for doc in query.stream():
                video_data = doc.to_dict()
                video_data['id'] = doc.id
                
                # Convert timestamps to ISO strings for JSON serialization
                if 'created_at' in video_data and video_data['created_at']:
                    video_data['created_at'] = video_data['created_at'].isoformat()
                if 'updated_at' in video_data and video_data['updated_at']:
                    video_data['updated_at'] = video_data['updated_at'].isoformat()
                
                videos.append(video_data)
            
            return videos
            
        except Exception as e:
            # Handle specific Firestore database not found error
            error_str = str(e)
            if "database (default) does not exist" in error_str or "404" in error_str:
                print(f"Warning: Firestore database not set up yet. Please visit https://console.cloud.google.com/datastore/setup to create the database.")
                return []
            else:
                raise Exception(f"Failed to get user videos: {str(e)}")
    
    def update_video_name(self, user_id: str, video_id: str, new_display_name: str) -> bool:
        """
        Update the display name of a video
        
        Args:
            user_id: The user's ID
            video_id: The Firestore document ID of the video
            new_display_name: New display name for the video
            
        Returns:
            True if updated successfully
        """
        if not self.db:
            raise Exception("Firestore not initialized")
        
        try:
            # Get the document reference
            doc_ref = self.db.collection('user_videos').document(video_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                print(f"[DEBUG] Video document not found: {video_id}")
                return False
            
            # Verify the user owns this video
            video_data = doc.to_dict()
            if video_data.get('user_id') != user_id:
                print(f"[DEBUG] User {user_id} does not own video {video_id}")
                return False
            
            # Update the display name
            doc_ref.update({
                'display_name': new_display_name,
                'updated_at': datetime.now()
            })
            
            print(f"[DEBUG] Video display name updated successfully")
            return True
            
        except Exception as e:
            print(f"Failed to update video name: {str(e)}")
            return False
    
    def delete_video_metadata(self, user_id: str, video_id: str) -> bool:
        """
        Delete video metadata from Firestore
        
        Args:
            user_id: The user's ID
            video_id: The Firestore document ID of the video
            
        Returns:
            True if deleted successfully
        """
        if not self.db:
            raise Exception("Firestore not initialized")
        
        try:
            # Get the document reference
            doc_ref = self.db.collection('user_videos').document(video_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return False
            
            # Verify the user owns this video
            video_data = doc.to_dict()
            if video_data.get('user_id') != user_id:
                return False
            
            # Delete the document
            doc_ref.delete()
            return True
            
        except Exception as e:
            print(f"Failed to delete video metadata: {str(e)}")
            return False
    
    def get_video_by_storage_path(self, user_id: str, storage_path: str) -> Optional[Dict]:
        """
        Get video metadata by storage path
        
        Args:
            user_id: The user's ID
            storage_path: The Firebase Storage path
            
        Returns:
            Video metadata or None if not found
        """
        if not self.db:
            raise Exception("Firestore not initialized")
        
        try:
            videos_ref = self.db.collection('user_videos')
            query = videos_ref.where('user_id', '==', user_id).where('storage_path', '==', storage_path)
            
            for doc in query.stream():
                video_data = doc.to_dict()
                video_data['id'] = doc.id
                
                # Convert timestamps to ISO strings
                if 'created_at' in video_data and video_data['created_at']:
                    video_data['created_at'] = video_data['created_at'].isoformat()
                if 'updated_at' in video_data and video_data['updated_at']:
                    video_data['updated_at'] = video_data['updated_at'].isoformat()
                
                return video_data
            
            return None
            
        except Exception as e:
            raise Exception(f"Failed to get video by storage path: {str(e)}")
    
    def update_video_display_name(self, user_id: str, video_id: str, new_display_name: str) -> bool:
        """
        Update the display name of a video
        
        Args:
            user_id: The user's ID
            video_id: The Firestore document ID of the video
            new_display_name: New display name for the video
            
        Returns:
            True if updated successfully
        """
        return self.update_video_name(user_id, video_id, new_display_name)
    
    def delete_video(self, user_id: str, video_id: str) -> bool:
        """
        Delete video metadata from Firestore (alias for delete_video_metadata)
        
        Args:
            user_id: The user's ID
            video_id: The Firestore document ID of the video
            
        Returns:
            True if deleted successfully
        """
        return self.delete_video_metadata(user_id, video_id)
    
    def search_videos_by_concepts(self, user_id: str, concepts: List[str]) -> List[Dict]:
        """
        Search videos by key concepts
        
        Args:
            user_id: The user's ID
            concepts: List of concepts to search for
            
        Returns:
            List of video metadata documents that match the concepts
        """
        if not self.db:
            print("Warning: Firestore not initialized, returning empty video list")
            return []
        
        try:
            # Get all user videos first
            all_videos = self.get_user_videos(user_id)
            
            # Filter videos that contain any of the search concepts
            matching_videos = []
            for video in all_videos:
                video_concepts = video.get('key_concepts', [])
                if video_concepts:
                    # Check if any of the search concepts match video concepts (case-insensitive)
                    for search_concept in concepts:
                        for video_concept in video_concepts:
                            # Handle both string and dict formats for key_concepts
                            if isinstance(video_concept, dict):
                                concept_text = video_concept.get('keyword', '')
                            else:
                                concept_text = str(video_concept)
                            
                            if search_concept.lower() in concept_text.lower():
                                matching_videos.append(video)
                                break
                        else:
                            continue
                        break
            
            return matching_videos
            
        except Exception as e:
            print(f"Failed to search videos by concepts: {str(e)}")
            return []
    
    def get_all_user_concepts(self, user_id: str) -> List[str]:
        """
        Get all unique concepts from user's videos
        
        Args:
            user_id: The user's ID
            
        Returns:
            List of unique concepts
        """
        if not self.db:
            print("Warning: Firestore not initialized, returning empty concepts list")
            return []
        
        try:
            all_videos = self.get_user_videos(user_id)
            
            unique_concepts = set()
            for video in all_videos:
                video_concepts = video.get('key_concepts', [])
                if video_concepts:
                    for concept in video_concepts:
                        # Handle both string and dict formats for key_concepts
                        if isinstance(concept, dict):
                            concept_text = concept.get('keyword', '')
                        else:
                            concept_text = str(concept)
                        
                        if concept_text:
                            unique_concepts.add(concept_text)
            
            return sorted(list(unique_concepts))
            
        except Exception as e:
            print(f"Failed to get user concepts: {str(e)}")
            return []

# Global instance
firestore_service = FirestoreService()
