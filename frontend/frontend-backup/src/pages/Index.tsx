import Navbar from "@/components/Navbar";
import FileUploadCard from "@/components/FileUploadCard";
import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

const summaryLevels = [
  { label: "Beginner" },
  { label: "Intermediate" },
  { label: "Advanced" },
];

const Index = () => {
  const [selectedLevel, setSelectedLevel] = useState(0);

  return (
    <div className="bg-[#232329] min-h-screen w-full flex flex-col items-center justify-start font-nunito">
      <div className="w-full h-full min-h-screen bg-white rounded-none shadow-none animate-fade-in flex flex-col">
        <Navbar />

        <main className="flex-grow w-full flex flex-col items-center mt-8 px-4 sm:px-8">
          <h1 className="font-extrabold text-4xl sm:text-5xl text-primary text-center mt-4 leading-tight">
            Transform Research.
          </h1>
          <div className="text-gray-600 mt-4 text-lg text-center max-w-4xl">
            Upload a paper and get visual summaries, simplified explanations, and narrated presentations.
          </div>

          <div className="mt-7 w-full flex flex-col items-center">
            <FileUploadCard />
          </div>

          <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
            {summaryLevels.map((level, idx) => (
              <button
                key={level.label}
                onClick={() => setSelectedLevel(idx)}
                className={`px-7 py-2 text-base rounded-full font-semibold transition-all border
                  ${
                    idx === selectedLevel
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-primary border-primary/30 hover:bg-primary/10"
                  }
                  `}
              >
                {level.label}
              </button>
            ))}
            <button
              className="ml-2 px-7 py-2 text-base rounded-full font-semibold bg-primary text-white hover:bg-primary/80 transition-colors flex items-center gap-2"
              style={{ boxShadow: "0 2px 16px 0 rgb(37 99 235 / 9%)" }}
            >
              Go <ArrowRight size={20} className="inline ml-1" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;