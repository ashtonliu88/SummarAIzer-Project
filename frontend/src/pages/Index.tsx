import React from 'react';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import DifficultySelector from '@/components/DifficultySelector';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-[#2261CF] text-4xl font-bold mb-4">
            Transform Research
          </h1>
          <p className="text-gray-600 text-lg">
            Upload a paper and get visual summaries, simplified explanations, and narrated presentations.
          </p>
        </div>
        
        <div className="mb-8"> {/* Reduced bottom margin */}
          <UploadArea />
        </div>
        
        <div className="flex justify-center"> {/* Added centering */}
          <DifficultySelector />
        </div>
      </main>
    </div>
  );
};

export default Index;
