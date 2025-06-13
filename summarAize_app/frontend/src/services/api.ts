// src/services/api.ts
import { auth } from '@/config/firebase-config';
import { getAuth } from 'firebase/auth';

const API_URL = 'http://localhost:8000';  // Replace with your actual API URL in production

export interface UserPreference {
  difficulty_level?: string;
  include_citations?: boolean;
  theme?: string;
}

export interface SavedSummary {
  id: string;
  title: string;
  date_created: string;
  summary: string;
  references?: string[];
  keywords?: string[];
}

export interface SummaryPreview {
  id: string;
  title: string;
  date_created: string;
  summary_preview: string;
}

/**
 * Get the current user's ID token for authentication
 */
export const getToken = async (): Promise<string | null> => {
  const user = getAuth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

/**
 * Generic API fetch function with authentication
 */
async function fetchWithAuth<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * API service for user-related operations
 */
export const userApi = {
  /**
   * Get current user information
   */
  getCurrentUser: async () => {
    return fetchWithAuth('/auth/me', { method: 'GET' });
  },
  
  /**
   * Update user preferences
   */
  updatePreferences: async (preferences: UserPreference) => {
    return fetchWithAuth('/auth/preferences', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  },
  
  /**
   * Verify if the current token is valid
   */
  verifyToken: async () => {
    return fetchWithAuth<{ valid: boolean; user: any }>('/auth/verify-token', {
      method: 'GET',
    });
  },
};

/**
 * API service for library operations
 */
export const libraryApi = {
  /**
   * Get user's saved summaries
   */
  getUserLibrary: async () => {
    return fetchWithAuth<{ user_id: string; summaries: SummaryPreview[] }>('/user/library', {
      method: 'GET',
    });
  },
  
  /**
   * Save a summary to the user's library
   */
  saveSummary: async (summary: SavedSummary) => {
    return fetchWithAuth<{ success: boolean; summary_id: string; message: string }>('/user/library', {
      method: 'POST',
      body: JSON.stringify(summary),
    });
  },
};

/**
 * API service for video operations
 */
export const videoApi = {
  /**
   * Generate video from PDF with authentication (saves to user's Firebase storage)
   */
  generateVideo: async (file: File, userChosenName: string, audioName?: string) => {
    const token = await getToken();
    console.log("Firebase token:", token);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('custom_name', userChosenName);
    if (audioName) {
      formData.append("audio_name", audioName);
    }

    const response = await fetch(`${API_URL}/generate-visuals-video-auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Video generation failed: ${response.status}`);
    }

    return await response.json() as {
      video_url: string;
      video_name: string;
      firebase_url?: string;
      user_id: string;
      extract_time: number;
      video_time: number;
      total_time: number;
    };
  },
  
  /**
   * Get all videos for the authenticated user
   */
  getUserVideos: async () => {
    return fetchWithAuth<{
      user_id: string;
      videos: Array<{
        video_name: string;
        storage_path: string;
        download_url: string;
        size: number;
        created_at?: string;
        updated_at?: string;
      }>;
      count: number;
    }>('/user-videos', {
      method: 'GET',
    });
  },
  
  /**
   * Delete a specific video for the authenticated user
   */
  deleteVideo: async (videoName: string) => {
    return fetchWithAuth<{
      message: string;
      video_name: string;
    }>(`/user-videos/${videoName}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * Get download URL for a specific user's video
   */
  getVideoDownloadUrl: async (videoName: string) => {
    return fetchWithAuth<{
      video_name: string;
      download_url: string;
    }>(`/user-videos/${videoName}/download`, {
      method: 'GET',
    });
  },
};
