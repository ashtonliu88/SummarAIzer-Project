import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const DifficultySelector = () => {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-full shadow-sm border border-gray-100 mt-4"> {/* Added slight top margin */}
      <Button 
        variant="ghost"
        className="bg-[#5B9BFF] text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-[#4A8AFF] transition-all hover:shadow-md"
      >
        Beginner
      </Button>
      <Button 
        variant="ghost"
        className="text-gray-600 rounded-full px-6 py-2 text-sm font-medium hover:bg-gray-100 transition-all"
      >
        Intermediate
      </Button>
      <Button 
        variant="ghost"
        className="text-gray-600 rounded-full px-6 py-2 text-sm font-medium hover:bg-gray-100 transition-all"
      >
        Advanced
      </Button>
      <Button 
        className="bg-[#2261CF] text-white rounded-full px-6 py-2 text-sm font-medium hover:bg-[#1B50B0] transition-all hover:shadow-md ml-auto"
      >
        Go <ArrowRight className="ml-1 h-4 w-4" /> {/* Changed from "Process" to "Go" */}
      </Button>
    </div>
  );
};

export default DifficultySelector;