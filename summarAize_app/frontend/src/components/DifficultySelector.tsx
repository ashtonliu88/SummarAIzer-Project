import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface DifficultySelectorProps {
  selectedDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onProcess: () => void;
  isProcessing: boolean;
  isFileSelected: boolean;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ 
  selectedDifficulty, 
  onDifficultyChange, 
  onProcess, 
  isProcessing, 
  isFileSelected 
}) => {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-full shadow-sm border border-gray-100 mt-4">
      <Button 
        variant="ghost"
        className={`${
          selectedDifficulty === 'beginner' 
            ? 'bg-[#5B9BFF] text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        } rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 ease-in-out`}
        onClick={() => onDifficultyChange('beginner')}
      >
        Beginner
      </Button>
      <Button 
        variant="ghost"
        className={`${
          selectedDifficulty === 'intermediate' 
            ? 'bg-[#5B9BFF] text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        } rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 ease-in-out`}
        onClick={() => onDifficultyChange('intermediate')}
      >
        Intermediate
      </Button>
      <Button 
        variant="ghost"
        className={`${
          selectedDifficulty === 'advanced' 
            ? 'bg-[#5B9BFF] text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        } rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 ease-in-out`}
        onClick={() => onDifficultyChange('advanced')}
      >
        Advanced
      </Button>
      <Button 
        className={`rounded-full px-6 py-2 text-sm font-medium ml-auto transition-all duration-300 ease-in-out transform hover:scale-105 ${
          isProcessing || !isFileSelected
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-[#2261CF] text-white hover:bg-[#1B50B0] hover:shadow-md'
        }`}
        onClick={onProcess}
        disabled={isProcessing || !isFileSelected}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            Go <ArrowRight className="ml-1 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default DifficultySelector;