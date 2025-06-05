import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface UploadAreaProps {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  includeCitations: boolean;
  setIncludeCitations: (include: boolean) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ 
  selectedFile, 
  setSelectedFile, 
  includeCitations, 
  setIncludeCitations
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const dragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    const file = 'dataTransfer' in e ? e.dataTransfer.files?.[0] : e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    toast.success(`Selected: ${file.name}`);
  };

  return (
    <div className="space-y-6">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-2xl bg-[#F8F9FE] p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#5B9BFF] transition-all hover:shadow-lg"
        onClick={handleClick}
        onDragOver={dragOver}
        onDrop={handleFileSelect}
      >
        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileSelect}
        />
        <div className="w-16 h-16 bg-[#5B9BFF] rounded-full flex items-center justify-center mb-4 hover:scale-105 transition-transform">
          <Upload className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-700 font-medium mb-1">Drop your research paper here</p>
        <p className="text-gray-500 text-sm">or click to browse</p>

        {selectedFile && (
          <div className="mt-4 flex items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">{selectedFile.name}</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCitations}
            onChange={(e) => setIncludeCitations(e.target.checked)}
            className="rounded border-gray-300 text-[#5B9BFF] focus:ring-[#5B9BFF] h-5 w-5"
          />
          <span className="flex items-center">
            Include citations 
            <span className={`ml-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
              includeCitations ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              [Author, Year]
            </span>
          </span>
        </label>
      </div>
    </div>
  );
};

export default UploadArea;
