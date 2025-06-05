// src/components/VideoPlayer.tsx
import React from 'react';
import { Download, Play } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  if (!videoUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `summary-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <video 
          controls 
          className="w-full max-w-2xl mx-auto" 
          style={{ maxHeight: '400px' }}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download Video</span>
        </button>
        
        <a 
          href={videoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Open in New Tab</span>
        </a>
      </div>
    </div>
  );
};

export default VideoPlayer;
