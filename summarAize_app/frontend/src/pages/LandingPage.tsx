// src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="pt-6 pb-4 flex justify-between items-center">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-[#2261CF]">
              SummarAIze
            </h1>
          </div>
          <div>
            <Link to="/login">
              <Button variant="outline" className="mr-3 border-[#2261CF] text-[#2261CF] hover:bg-blue-50">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-[#2261CF] hover:bg-[#1a4db3] text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero section */}
        <div className="py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2261CF] mb-6">
                Transform Complex Research into Clear Summaries
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                SummarAIze uses advanced AI to help you understand research papers quickly. 
                Upload a paper and get concise summaries, key points, and references instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button className="px-6 py-3 bg-[#2261CF] hover:bg-[#1a4db3] text-white text-lg rounded-lg">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="px-6 py-3 border-[#2261CF] text-[#2261CF] hover:bg-blue-50 text-lg rounded-lg">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#2261CF] to-purple-600 rounded-lg blur opacity-25"></div>
              <div className="relative shadow-xl rounded-lg overflow-hidden bg-white">
                <img 
                  src="/images/summary-preview.png" 
                  alt="SummarAIze Demo" 
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://via.placeholder.com/600x400?text=SummarAIze+Demo";
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features section */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#2261CF]">
            Features That Make Research Easier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2261CF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Quick Summaries</h3>
              <p className="text-gray-600">
                Get concise, accurate summaries of research papers in seconds, not hours.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2261CF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Chat</h3>
              <p className="text-gray-600">
                Ask questions about the paper and get answers from our AI assistant.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2261CF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Key Insights</h3>
              <p className="text-gray-600">
                Extract keywords, references, and visualize connections between concepts.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#2261CF]">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Dr. Emily Johnson</h4>
                  <p className="text-sm text-gray-500">Research Scientist</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "SummarAIze has become an essential tool in my research workflow. It saves me hours
                of reading and helps me quickly understand the key points of complex papers."
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-semibold">Prof. Michael Chen</h4>
                  <p className="text-sm text-gray-500">University Professor</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "I recommend SummarAIze to all my graduate students. It's an incredible tool for 
                literature reviews and staying on top of the latest research in our field."
              </p>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="py-16 mb-10 text-center">
          <h2 className="text-3xl font-bold mb-6 text-[#2261CF]">
            Ready to Transform Your Research Experience?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto">
            Join thousands of researchers, academics, and students who are already 
            using SummarAIze to save time and enhance their understanding.
          </p>
          <Link to="/signup">
            <Button className="px-8 py-3 bg-[#2261CF] hover:bg-[#1a4db3] text-white text-lg rounded-lg">
              Get Started Today
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 mb-4 md:mb-0">
              © 2025 SummarAIze. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-[#2261CF]">
                Terms of Service
              </a>
              <a href="#" className="text-gray-600 hover:text-[#2261CF]">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-600 hover:text-[#2261CF]">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
