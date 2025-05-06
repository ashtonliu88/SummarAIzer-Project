import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '@/config/firebase-config';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-[#2261CF] py-4 px-6 shadow-sm"> 
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link 
          to="/" 
          className="text-white text-2xl font-bold tracking-wider hover:opacity-80 transition-opacity"
        > 
          SummarAlze
        </Link>
        <div className="flex items-center space-x-6"> 
          <Link 
            to="/" 
            className="text-white text-sm hover:underline hover:text-gray-200 transition-all"
          >
            Home
          </Link>
          <Link 
            to="/library" 
            className="text-white text-sm hover:underline hover:text-gray-200 transition-all"
          >
            My Library
          </Link>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm truncate max-w-[150px]">
                {user.email}
              </span>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="text-[#2261CF] text-sm border-white"
                size="sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="text-white text-sm hover:underline hover:text-gray-200 transition-all"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
