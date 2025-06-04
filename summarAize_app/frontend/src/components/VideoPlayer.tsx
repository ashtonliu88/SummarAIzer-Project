// src/components/VideoPlayer.tsx
import React from 'react';

interface VideoPlayerProps {
  videoUrl: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  if (!videoUrl) return null;

  return (
    <div className="mt-6 flex flex-col items-center space-y-4">
      <video controls width="640">
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <a href={videoUrl} download className="text-blue-500 underline">
        Download Video
      </a>
    </div>
  );
};

export default VideoPlayer;
