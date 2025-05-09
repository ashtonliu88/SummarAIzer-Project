// src/pages/Index.tsx
import { ThemeToggle } from "@/components/theme-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import DifficultySelector from '@/components/DifficultySelector';
import SummaryViewer from '@/components/SummaryViewer';
import TTSPlayer from '@/components/TTSPlayer';

const Index = () => {
  const [summary, setSummary] = useState<string>('');
  // for summary length
  const [length, setLength] = useState<'short'|'medium'|'detailed'>('medium');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="flex justify-end px-4 mt-4">
        <ModeToggle />
      </div>
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-[#2261CF]">
            Transform Research
          </h1>
          <p className="text-gray-600">
            Upload a paper and get visual summaries, simplified explanations, and narrated presentations.
          </p>
        </header>

        {/* <UploadArea onSummaryReady={setSummary} /> */}

        <div className="length-selector mb-6">
          <label className="mr-4 font-medium text-gray-700">
            Summary Length:
            <select
              value={length}
              onChange={e => setLength(e.target.value as any)}
              className="ml-2 p-2 border border-gray-300 rounded px-2 py-1"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
          </label>
        </div>

        <UploadArea onSummaryReady={setSummary} length={length} />


        {summary && (
          <section className="space-y-8">
            <article className="bg-card text-card-foreground p-8 rounded-2xl shadow-lg border border-border">
              <SummaryViewer markdown={summary} />
            </article>
            <div className="bg-card text-card-foreground p-6 rounded-xl shadow-sm border border-border flex justify-center">
            <TTSPlayer summary={summary} />
            </div>
          </section>
        )}
        <footer className="flex justify-center bg-background">
          <DifficultySelector />
        </footer>
      </main>
    </div>
  );
};

export default Index;