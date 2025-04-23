import React from 'react';
import Navbar from '@/components/Navbar';

const Login = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-[#2261CF]">Login</h1>
      </div>
    </div>
  );
};

export default Login;