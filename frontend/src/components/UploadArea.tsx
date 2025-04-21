import React from 'react';
import { Upload } from 'lucide-react';

const UploadArea = () => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-[#F8F9FE] p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#5B9BFF] transition-all hover:shadow-lg">
      <div className="w-16 h-16 bg-[#5B9BFF] rounded-full flex items-center justify-center mb-4 hover:scale-105 transition-transform">
        <Upload className="w-8 h-8 text-white" />
      </div>
      <p className="text-gray-700 font-medium mb-1">Drop your research paper here</p>
      <p className="text-gray-500 text-sm">or click to browse</p>
    </div>
  );
};

export default UploadArea;
