import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/sonner';

interface TTSPlayerProps {
  summary: string;
}

const API = import.meta.env.VITE_API_URL || "";  

const TTSPlayer: React.FC<TTSPlayerProps> = ({ summary }) => {
  const [audioUrl, setAudioUrl] = useState<string>("");

  useEffect(() => {
    const generateAudio = async () => {
      if (!summary){
        console.log("[TTSPlayer] no summary, aborting");
        return;
      }

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
        if (response.ok) {
          setAudioUrl(`${API}${data.audio_url}`);
          toast.success("Audio Ready!");
        } else {
          toast.error(`Audio Error: ${data.error}`);
        }
      } catch (err) {
        toast.error("Failed to generate audio.");
      }
    };

    generateAudio();
  }, [summary]);

  if (!summary) return null;

  return (
    <div className="mt-6 flex flex-col items-center">
      {audioUrl ? (
        <>
          <audio controls>
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <a href={audioUrl} download className="mt-2 text-blue-500 underline">
            Download Audio
          </a>
        </>
      ) : (
        <p className="text-gray-500">Generating audio...</p>
      )}
    </div>
  );
};

export default TTSPlayer;
