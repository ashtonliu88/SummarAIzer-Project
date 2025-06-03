// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/config/firebase-config';
import { toast } from '@/components/ui/sonner';
import { userApi, UserPreference } from '@/services/api';

interface UserData {
  uid: string;
  email?: string;
  display_name?: string;
  photo_url?: string;
  preferences?: UserPreference;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  updateUserPreferences: (preferences: UserPreference) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from backend when the user is authenticated
  const fetchUserData = async (user: User) => {
    try {
      const userInfo = await userApi.getCurrentUser();
      setUserData(userInfo as UserData);
    } catch (error) {
      console.error('Failed to fetch user data', error);
      // Create minimal user data from Firebase user object
      setUserData({
        uid: user.uid,
        email: user.email || undefined,
        display_name: user.displayName || undefined,
        photo_url: user.photoURL || undefined,
      });
    }
  };
  
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signup(email: string, password: string, name: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's profile with their name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please try logging in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up.';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error signing out');
      throw error;
    }
  }

  async function googleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  }

  async function updateUserPreferences(preferences: UserPreference): Promise<void> {
    try {
      const response = await userApi.updatePreferences(preferences);
      
      // Update local user data with new preferences
      if (userData) {
        setUserData({
          ...userData,
          preferences: {
            ...userData.preferences,
            ...preferences
          }
        });
      }
      
      toast.success('Preferences updated successfully');
      // Don't return the response
    } catch (error: any) {
      toast.error('Failed to update preferences');
      throw error;
    }
  }

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    signup,
    logout,
    googleSignIn,
    updateUserPreferences
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
