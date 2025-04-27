import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const UploadArea = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    //const file = e.target.files?.[0];
    const file = 'dataTransfer' in e ? e.dataTransfer.files?.[0] : e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("detailed", "false");  // or true, based on DifficultySelector

    toast("Uploading and summarizing...");

    try {
      const response = await fetch("http://127.0.0.1:8000/summarize", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Summary Ready!");
        console.log(data.summary);  // For now, just log it
        // You could route to a summary page or show a modal here
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err) {
      toast.error("Failed to connect to backend.");
    }
  };

  const dragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-2xl bg-[#F8F9FE] p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#5B9BFF] transition-all hover:shadow-lg"
      onClick={handleClick}
      onDragOver={dragOver}
    >
      <input 
        type="file" 
        accept="application/pdf" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />
      <div className="w-16 h-16 bg-[#5B9BFF] rounded-full flex items-center justify-center mb-4 hover:scale-105 transition-transform">
        <Upload className="w-8 h-8 text-white" />
      </div>
      <p className="text-gray-700 font-medium mb-1">Drop your research paper here</p>
      <p className="text-gray-500 text-sm">or click to browse</p>
    </div>
  );
};

export default UploadArea;
