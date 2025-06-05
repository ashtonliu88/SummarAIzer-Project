import React from 'react';
import { Loader2, Video } from 'lucide-react';

interface VideoGenerationLoaderProps {
  isVisible: boolean;
  message?: string;
}

const VideoGenerationLoader: React.FC<VideoGenerationLoaderProps> = ({ 
  isVisible, 
  message = "Generating your video..." 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Video className="w-16 h-16 text-[#2261CF]" />
            <Loader2 className="w-8 h-8 text-[#2261CF] animate-spin absolute -top-2 -right-2" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Creating Your Video
        </h3>
        
        <p className="text-gray-600 mb-4">
          {message}
        </p>
        
        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-[#2261CF] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#2261CF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#2261CF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          This may take a few moments...
        </p>
      </div>
    </div>
  );
};

export default VideoGenerationLoader;
