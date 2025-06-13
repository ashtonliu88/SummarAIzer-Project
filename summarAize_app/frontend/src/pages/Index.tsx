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
import { Volume2, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';



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
  images: string[]; 
  references: string[];
  referenceCount?: number;
  relatedPapers: RelatedPaper[];
  hasCitations?: boolean;
  keywords?: Keyword[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const Index = () => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [includeCitations, setIncludeCitations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [chosenName, setChosenName] = useState('');
  const [audioName, setAudioName] = useState<string | null>(null);


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
      const response = await fetch(`${API_BASE}/summarize`, {
        method: "POST",
        body: formData,
      });
    
      const data = await response.json();
    
      if (response.ok) {
        toast.success("Analysis complete!");
    
        const summaryData: SummaryData = {
          summary: data.summary || "",
          images: data.images || [],
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
              
              {/* Video Section */}
              <div className="space-y-3">
                {/* Name Input */}
                <div className="space-y-2">
                  <label htmlFor="videoName" className="block text-sm font-medium text-gray-700">
                    Name your video
                  </label>
                  <input
                    id="videoName"
                    type="text"
                    placeholder="Enter a name (optional)"
                    value={chosenName}
                    onChange={(e) => setChosenName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Generate Video Button */}
                <div>
                  <button
                    className="w-full bg-[#2261CF] text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-[#1b4fa6] transition duration-150"
                    disabled={!selectedFile || isGeneratingVideo}
                    onClick={async () => {
                      if (!selectedFile) {
                        toast.error("Please select a file first.");
                        return;
                      }

                      setIsGeneratingVideo(true);
                      toast("Generating visuals video...");

                      try {
                        const videoResult = await videoApi.generateVideo(selectedFile, chosenName.trim(), audioName || undefined);
                        const finalVideoUrl = videoResult.firebase_url || `${API_BASE}${videoResult.video_url}`;
                        setVideoUrl(finalVideoUrl);
                        toast.success(`Video Ready! Generated in ${videoResult.total_time.toFixed(1)}s`);
                      } catch (videoError) {
                        console.error("Video generation error:", videoError);
                        toast.error(
                          `Video generation failed: ${
                            videoError instanceof Error ? videoError.message : 'Unknown error'
                          }`
                        );
                      } finally {
                        setIsGeneratingVideo(false);
                      }
                    }}
                  >
                    {isGeneratingVideo ? "Generating..." : "Generate Visual Summary Video"}
                  </button>
                </div>
              </div>


              {/* Media Section with Header */}
              <section className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-6 h-6 text-purple-600" />
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Audio & Video</h2>
                  <span className="text-gray-500 text-lg">(2)</span>
                </div>
                
                <div className="space-y-8">
                  {/* Audio Section */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Audio Summary</h3>
                    </div>
                    <TTSPlayer 
                      summary={summaryData.summary}
                      setAudioName={setAudioName}
                    />
                  </div>

                  {/* Video Section */}
                  {videoUrl && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Video className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-800">Visual Summary</h3>
                      </div>
                      <VideoPlayer videoUrl={videoUrl} />
                    </div>
                  )}
                </div>
              </section>
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