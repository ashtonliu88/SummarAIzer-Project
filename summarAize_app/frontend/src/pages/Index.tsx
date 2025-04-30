// src/pages/Index.tsx
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import DifficultySelector from '@/components/DifficultySelector';
import SummaryViewer from '@/components/SummaryViewer';
import TTSPlayer from '@/components/TTSPlayer';

const Index = () => {
  const [summary, setSummary] = useState<string>('');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-[#2261CF]">
            Transform Research
          </h1>
          <p className="text-gray-600">
            Upload a paper and get visual summaries, simplified explanations, and narrated presentations.
          </p>
        </header>

        <UploadArea onSummaryReady={setSummary} />

        {summary && (
          <section className="space-y-8">
            <article className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <SummaryViewer markdown={summary} />
            </article>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-center">
              <TTSPlayer summary={summary} />
            </div>
          </section>
        )}
        <footer className="flex justify-center">
          <DifficultySelector />
        </footer>
      </main>
    </div>
  );
};

export default Index;