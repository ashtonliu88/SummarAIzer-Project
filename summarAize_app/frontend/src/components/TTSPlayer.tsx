import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { Download } from 'lucide-react';

interface TTSPlayerProps {
  summary: string;
}

const API = import.meta.env.VITE_API_URL || "";  

const TTSPlayer: React.FC<TTSPlayerProps> = ({ summary }) => {
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const generateAudio = async () => {
      if (!summary){
        console.log("[TTSPlayer] no summary, aborting");
        return;
      }

      setIsGenerating(true);
      setError("");
      setHasError(false);
      
      toast("Generating audio...");
      try {
        const response = await fetch(`${API}/generate-audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary }),
        });
        console.log("[TTSPlayer] fetch returned status", response.status);

        const data = await response.json();
        console.log("[TTSPlayer] parsed JSON:", data);
        
        if (response.ok && data.audio_url) {
          setAudioUrl(`${API}${data.audio_url}`);
          toast.success("Audio Ready!");
        } else if (response.status === 503 || data.fallback) {
          // Handle TTS service temporarily unavailable
          setError(data.message || "Text-to-speech service is temporarily unavailable");
          setHasError(true);
          toast.error("Audio generation temporarily unavailable");
        } else {
          setError(data.error || data.message || "Failed to generate audio");
          setHasError(true);
          toast.error(`Audio Error: ${data.error || "Unknown error"}`);
        }
      } catch (err) {
        console.error("[TTSPlayer] Error:", err);
        setError("Failed to connect to audio generation service");
        setHasError(true);
        toast.error("Failed to generate audio.");
      } finally {
        setIsGenerating(false);
      }
    };

    generateAudio();
  }, [summary]);

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `summary-audio-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!summary) return null;

  return (
    <div className="space-y-4">
      {hasError ? (
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium mb-2">Audio Generation Unavailable</p>
          <p className="text-yellow-700 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      ) : audioUrl ? (
        <>
          <div className="flex justify-center">
            <audio controls className="w-full max-w-2xl">
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Audio</span>
            </button>
          </div>
        </>
      ) : isGenerating ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Generating audio...</p>
        </div>
      ) : (
        <p className="text-gray-500 text-center">Preparing audio generation...</p>
      )}
    </div>
  );
};

export default TTSPlayer;