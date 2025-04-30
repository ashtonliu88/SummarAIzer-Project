import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/sonner';

interface TTSPlayerProps {
  summary: string;
}

const TTSPlayer: React.FC<TTSPlayerProps> = ({ summary }) => {
  const [audioUrl, setAudioUrl] = useState<string>("");

  useEffect(() => {
    const generateAudio = async () => {
      if (!summary) return;

      toast("Generating audio...");
      try {
        const response = await fetch("http://127.0.0.1:8000/generate-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(summary),
        });

        const data = await response.json();
        if (response.ok) {
          setAudioUrl(data.audio_url);
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
