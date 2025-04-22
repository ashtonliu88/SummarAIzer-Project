import React, { useRef, useState } from "react";
import { Upload } from "lucide-react";

const UploadArea = ({ onFileSelect }) => {
    const fileInputRef = useRef(null);
    const [pdf, setPdf] = useState(null);

    const fileSelect = (e) => {
        const file = e.target.files[0];
        console.log(file);
        if (file.type === "application/pdf") {
            onFileSelect?.(file);
            const url = URL.createObjectURL(file);
            setPdf(url);
        }
    };

    const drop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file.type === "application/pdf") {
            onFileSelect?.(file);
        } else {
            alert("Please drop a PDF file.");
        }
    };

    const dragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div
            className="border-2 border-dashed border-gray-300 rounded-2xl bg-[#F8F9FE] p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#5B9BFF] transition-all hover:shadow-lg"
            onClick={() => fileInputRef.current.click()}
            onDrop={drop}
            onDragOver={dragOver}
        >
            <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                className="hidden"
                onChange={fileSelect}
            />
            <div className="w-16 h-16 bg-[#5B9BFF] rounded-full flex items-center justify-center mb-4 hover:scale-105 transition-transform">
                <Upload className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-700 font-medium mb-1">
                Drop your research paper here
            </p>
            <p className="text-gray-500 text-sm">or click to browse</p>

            {pdf && (
              <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                <embed src={pdf} type="application/pdf" className="w-full h-full" />
              </div>
            )}
        </div>
    );
};

export default UploadArea;
