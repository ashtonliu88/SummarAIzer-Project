
import { Plus } from "lucide-react";
import React from "react";

const FileUploadCard = () => (
  <div className="w-full flex flex-col items-center py-8">
    <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-accent/40 w-full max-w-xl min-h-[220px] flex flex-col items-center justify-center transition-shadow hover:shadow-lg animate-fade-in">
      <div className="flex flex-col items-center">
        <span className="bg-primary/20 rounded-full w-20 h-20 flex items-center justify-center mb-2">
          <Plus className="text-primary" size={44} />
        </span>
        <div className="text-gray-500 font-medium">
          Drop your research paper here
        </div>
        <div className="text-gray-400 text-sm mt-1 underline underline-offset-2 cursor-pointer">
          or click to browse
        </div>
      </div>
    </div>
  </div>
);

export default FileUploadCard;
