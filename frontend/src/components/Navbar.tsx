
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
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
          <Link 
            to="/login" 
            className="text-white text-sm hover:underline hover:text-gray-200 transition-all"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
