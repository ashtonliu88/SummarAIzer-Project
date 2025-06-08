import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
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
            to="/videos" 
            className="text-white text-sm hover:underline hover:text-gray-200 transition-all"
          >
            My Videos
          </Link>
          
          {currentUser ? (
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm truncate max-w-[150px]">
                {currentUser.email}
              </span>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                className="!bg-white !border-white text-[#2261CF] hover:!bg-gray-100"
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
