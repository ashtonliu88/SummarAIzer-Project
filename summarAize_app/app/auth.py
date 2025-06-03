from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, auth
from typing import Dict, Optional

# Initialize Firebase Admin SDK
try:
    # Use credentials from environment variable if available, otherwise use default credentials
    cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebase-service-account.json')
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
except (ValueError, FileNotFoundError):
    # If running in a production environment like Google Cloud, use default credentials
    try:
        firebase_admin.initialize_app()
    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}")

# Security scheme for JWT tokens
security = HTTPBearer()

class TokenPayload(BaseModel):
    uid: str
    email: Optional[str] = None
    exp: Optional[int] = None

class UserInfo(BaseModel):
    uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> UserInfo:
    """
    Verify the Firebase ID token and extract user information.
    """
    token = credentials.credentials
    try:
        # Verify the token with Firebase
        decoded_token = auth.verify_id_token(token)
        
        # Extract user info
        user_info = UserInfo(
            uid=decoded_token.get('uid'),
            email=decoded_token.get('email'),
            display_name=decoded_token.get('name'),
            photo_url=decoded_token.get('picture')
        )
        return user_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(user: UserInfo = Depends(verify_token)) -> UserInfo:
    """
    Get the current authenticated user.
    """
    return user
