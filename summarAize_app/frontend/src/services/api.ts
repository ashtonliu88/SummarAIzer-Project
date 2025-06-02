// src/services/api.ts
import { auth } from '@/config/firebase-config';

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
const getToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user.getIdToken(true);
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
