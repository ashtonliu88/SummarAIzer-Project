// src/pages/Index.tsx
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import UploadArea from '@/components/UploadArea';
import DifficultySelector, { DifficultyLevel } from '@/components/DifficultySelector';
import SummaryViewer from '@/components/SummaryViewer';
import TTSPlayer from '@/components/TTSPlayer';
import References from '@/components/References';
import RelatedPapers from '@/components/RelatedPapers';
import Keywords from '@/components/Keywords';
import FloatingChatbot from '@/components/FloatingChatbot';
import { toast } from '@/components/ui/sonner';

interface RelatedPaper {
  title: string;
  authors: string;
  year?: number;
  abstract?: string;
  url?: string;
  venue?: string;
  citationCount?: number;
}

interface Keyword {
  keyword: string;
  score: number;
  explanation: string;
}

interface SummaryData {
  summary: string;
  references: string[];
  referenceCount?: number;
  relatedPapers: RelatedPaper[];
  hasCitations?: boolean;
  keywords?: Keyword[];
}

const Index = () => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [includeCitations, setIncludeCitations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file first");
      return;
    }

    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    // The backend expects 'detailed' as a string value:
    // 'true' for advanced level, 'false' for beginner/intermediate level
    const detailedValue = difficultyLevel === 'advanced' ? 'true' : 'false';
    
    formData.append("detailed", detailedValue);
    formData.append("citations", includeCitations.toString());

    toast("Uploading and analyzing paper...");

    try {
      const response = await fetch("http://127.0.0.1:8000/summarize", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Analysis complete!");
        console.log(`Received ${data.references?.length || 0} references and ${data.keywords?.length || 0} keywords`);
        
        // Make sure all required properties are present
        const summaryData: SummaryData = {
          summary: data.summary || "",
          references: data.references || [],
          referenceCount: data.referenceCount || data.references?.length || 0,
          relatedPapers: data.relatedPapers || [],
          hasCitations: data.hasCitations || includeCitations,
          keywords: data.keywords || []
        };
        
        setSummaryData(summaryData);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err) {
      toast.error("Failed to connect to backend.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
          <header className="text-center space-y-4">
            <h1 className="text-4xl font-extrabold text-[#2261CF]">
              Transform Research
            </h1>
            <p className="text-gray-600">
              Upload a paper and get visual summaries, key concepts, and references.
            </p>
          </header>

          <div className="space-y-6">
            <UploadArea 
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              includeCitations={includeCitations}
              setIncludeCitations={setIncludeCitations}
            />
            
            <DifficultySelector 
              selectedDifficulty={difficultyLevel}
              onDifficultyChange={setDifficultyLevel}
              onProcess={handleProcess}
              isProcessing={isProcessing}
              isFileSelected={!!selectedFile}
            />
          </div>

          {summaryData && (
            <section className="space-y-8">
              <article className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <SummaryViewer 
                  markdown={summaryData.summary} 
                  hasCitations={summaryData.hasCitations}
                  references={summaryData.references}
                  keywords={summaryData.keywords?.map(k => k.keyword)} 
                  onSummaryUpdate={(newSummary) => {
                    setSummaryData(prev => prev ? {...prev, summary: newSummary} : null);
                  }}
                />
              </article>
              
              {summaryData.keywords && summaryData.keywords.length > 0 && (
                <Keywords keywords={summaryData.keywords} />
              )}
              
              {summaryData.references && summaryData.references.length > 0 && (
                <References references={summaryData.references} />
              )}
              
              {summaryData.relatedPapers && summaryData.relatedPapers.length > 0 && (
                <RelatedPapers papers={summaryData.relatedPapers} />
              )}
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-center">
                <TTSPlayer summary={summaryData.summary} />
              </div>
            </section>
          )}
        </main>
      </div>
      
      {/* Floating Chatbot - positioned at the root level of the component */}
      {summaryData && (
        <FloatingChatbot 
          summary={summaryData.summary}
          references={summaryData.references}
          keywords={summaryData.keywords?.map(k => k.keyword)}
          onSummaryUpdate={(newSummary) => {
            setSummaryData(prev => prev ? {...prev, summary: newSummary} : null);
          }}
        />
      )}
    </>
  );
};

export default Index;