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
import VideoPlayer from '@/components/VideoPlayer';
import { toast } from '@/components/ui/sonner';
import { videoApi } from '@/services/api';

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface RelatedPaper {
  title: string;
  authors: string;
  year?: number;
  abstract?: string;
  url?: string;
  citationCount?: number;
}

interface Keyword {
  keyword: string;
  score: number;
  explanation: string;
}

interface SummaryData {
  summary: string;
  images: string[]; 
  references: string[];
  referenceCount?: number;
  relatedPapers: RelatedPaper[];
  hasCitations?: boolean;
  keywords?: Keyword[];
}

const Index: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [includeCitations, setIncludeCitations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');
  const [summary, setSummary] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [chosenName, setChosenName] = useState('');

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
    const detailed = difficultyLevel === 'advanced' ? 'true' : 'false';
    formData.append("detailed", detailed);

    toast("Processing your PDF...");

    try {
      const response = await fetch(`${API}/summarize`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const summaryData: SummaryData = {
          summary: data.summary,
          images: data.images || [],
          references: data.references || [],
          referenceCount: data.referenceCount || data.references?.length || 0,
          relatedPapers: data.relatedPapers || [],
          hasCitations: data.hasCitations || includeCitations,
          keywords: data.keywords || []
        };
    
        setSummaryData(summaryData);
    
        // Now generate video using authenticated endpoint!
        if (selectedFile) {
          setIsGeneratingVideo(true);
          toast("Generating visuals video...");
          
          try {
            const videoResult = await videoApi.generateVideo(selectedFile);
            
            // Use Firebase URL if available, otherwise fallback to local URL
            const finalVideoUrl = videoResult.firebase_url || `${API}${videoResult.video_url}`;
            setVideoUrl(finalVideoUrl);
            
            toast.success(`Video Ready! Generated in ${videoResult.total_time.toFixed(1)}s`);
          } catch (videoError) {
            console.error("Video generation error:", videoError);
            toast.error(`Video generation failed: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`);
          } finally {
            setIsGeneratingVideo(false);
          }
        }
    
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err) {
      toast.error("Failed to connect to backend.");
    } finally {
      setIsProcessing(false);
    }    
  };

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const handleSummaryReady = (summary: string, images: string[]) => {
    setSummary(summary);
    setImages(images);
  };

  const generateVideo = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file first");
      return;
    }

    setIsGeneratingVideo(true);
    toast("Generating visuals video...");

    try {
      const videoResult = await videoApi.generateVideo(selectedFile, chosenName);
      
      // Use Firebase URL if available, otherwise fallback to local URL
      const finalVideoUrl = videoResult.firebase_url || `${API}${videoResult.video_url}`;
      setVideoUrl(finalVideoUrl);
      
      toast.success(`Video Ready! Generated in ${videoResult.total_time.toFixed(1)}s`);
    } catch (videoError) {
      console.error("Video generation error:", videoError);
      toast.error(`Video generation failed: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Research Paper Summarizer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your research papers and get AI-powered summaries with visual walkthroughs, 
            all saved securely to your personal account.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Controls */}
          <div className="space-y-6">
            <UploadArea 
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              includeCitations={includeCitations}
              setIncludeCitations={setIncludeCitations}
              onSummaryReady={handleSummaryReady}
            />
            
            <DifficultySelector 
              value={difficultyLevel}
              onChange={setDifficultyLevel}
            />
            
            <div className="space-y-4">
              <button
                onClick={handleProcess}
                disabled={!selectedFile || isProcessing}
                className="w-full bg-[#2261CF] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#1a4ca8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : "Generate Summary & Video"}
              </button>
              
              {summaryData && (
                <button
                  onClick={generateVideo}
                  disabled={!selectedFile || isGeneratingVideo}
                  className="w-full bg-[#28a745] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#218838] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingVideo ? "Generating Video..." : "Generate New Video"}
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {summaryData && (
              <>
                <SummaryViewer 
                  summary={summaryData.summary}
                  images={summaryData.images}
                />
                
                <TTSPlayer text={summaryData.summary} />
                
                {summaryData.keywords && summaryData.keywords.length > 0 && (
                  <Keywords keywords={summaryData.keywords} />
                )}
                
                {summaryData.references && summaryData.references.length > 0 && (
                  <References 
                    references={summaryData.references}
                    count={summaryData.referenceCount}
                  />
                )}
                
                {summaryData.relatedPapers && summaryData.relatedPapers.length > 0 && (
                  <RelatedPapers papers={summaryData.relatedPapers} />
                )}
              </>
            )}

            

            {videoUrl && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Video</h3>
                <VideoPlayer videoUrl={videoUrl} />
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingChatbot />
    </div>
  );
};

export default Index;
