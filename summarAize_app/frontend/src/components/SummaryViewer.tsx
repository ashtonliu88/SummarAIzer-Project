// src/components/SummaryViewer.tsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';

interface SummaryViewerProps {
  markdown: string;
  hasCitations?: boolean;
  references?: string[];
  keywords?: string[];
  onSummaryUpdate?: (newSummary: string) => void;
}

const SummaryViewer: React.FC<SummaryViewerProps> = ({ 
  markdown, 
  hasCitations = false,
  references = [],
  keywords = [],
  onSummaryUpdate = () => {}
}) => {
  const [citationStyle, setCitationStyle] = useState<'highlighted' | 'normal' | 'hidden'>(
    hasCitations ? 'highlighted' : 'normal'
  );
  const [currentSummary, setCurrentSummary] = useState(markdown);
  const [isUpdated, setIsUpdated] = useState(false);
  
  // Effect to update summary when external markdown prop changes
  useEffect(() => {
    setCurrentSummary(markdown);
    setIsUpdated(false);
  }, [markdown]);
  
  // Process citations in the format [Author, Year] to make them visually distinct
  const processMarkdown = (text: string): string => {
    if (!hasCitations) return text;
    
    // First, let's clean up the citation text to fix formatting issues
    let processedText = text
      // Remove emojis from citations
      .replace(/\[([\p{Emoji}]+\s*)?/gu, '[')
      // Fix spacing and extra commas
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*\]/g, ']')
      .replace(/\[\s*,\s*/g, '[');
    
    // Improved regular expression pattern that handles multiple citations and various formats
    const citationPattern = /\[([A-Za-z\s\-\.&,]+(?:\s+et\s+al\.?)?(?:,?\s*\d{4}[a-z]?)?(?:;\s*[A-Za-z\s\-\.&,]+(?:\s+et\s+al\.?)?(?:,?\s*\d{4}[a-z]?)?)*)\]/g;
    
    switch (citationStyle) {
      case 'highlighted':
        // Use the enhanced pattern for highlighting
        return processedText.replace(citationPattern, '**[$1]**');
      case 'normal':
        return processedText;
      case 'hidden':
        // Use the same pattern for hiding
        return processedText.replace(citationPattern, '');
      default:
        return processedText;
    }
  };

  const processedMarkdown = processMarkdown(currentSummary);
  
  const handleSummaryUpdate = (newSummary: string) => {
    setCurrentSummary(newSummary);
    setIsUpdated(true);
    onSummaryUpdate(newSummary);
  };

  return (
    <div>
      {isUpdated && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 border border-green-300 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>This summary has been updated based on your chat request.</span>
          </div>
          <button 
            onClick={() => setIsUpdated(false)} 
            className="text-green-700 hover:text-green-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
        
      {hasCitations && (
        <div className="mb-4 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setCitationStyle('highlighted')}
              className={`py-1 px-3 text-sm font-medium rounded-l-lg border ${
                citationStyle === 'highlighted' 
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Highlight Citations
            </button>
            <button
              type="button"
              onClick={() => setCitationStyle('normal')}
              className={`py-1 px-3 text-sm font-medium border-t border-b ${
                citationStyle === 'normal' 
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setCitationStyle('hidden')}
              className={`py-1 px-3 text-sm font-medium rounded-r-lg border ${
                citationStyle === 'hidden' 
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Hide Citations
            </button>
          </div>
        </div>
      )}
      
      <article className="prose prose-lg prose-indigo max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeSanitize, rehypeKatex]}
        >
          {processedMarkdown}
        </ReactMarkdown>
        
        {hasCitations && citationStyle === 'highlighted' && (
          <div className="mt-4 text-sm text-gray-500 border-t pt-2">
            <p>
              <span className="font-medium">Citations</span> are highlighted in the text in the format [Author, Year]. 
              These reference actual papers cited in the original research document.
            </p>
            <p className="mt-1">
              You can view the full references in the References section below.
            </p>
          </div>
        )}
      </article>
    </div>
  );
};

export default SummaryViewer;
