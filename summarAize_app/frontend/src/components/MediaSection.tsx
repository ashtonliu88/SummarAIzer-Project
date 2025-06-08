// src/components/MediaSection.tsx
import React from 'react';
import { Volume2, Video } from 'lucide-react';
import TTSPlayer from './TTSPlayer';
import VideoPlayer from './VideoPlayer';

interface MediaSectionProps {
  summary: string;
  videoUrl?: string;
}

const MediaSection: React.FC<MediaSectionProps> = ({ summary, videoUrl }) => {
  return (
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
          <TTSPlayer summary={summary} />
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
  );
};

export default MediaSection;