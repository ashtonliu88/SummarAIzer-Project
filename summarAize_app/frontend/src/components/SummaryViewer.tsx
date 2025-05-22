// src/components/SummaryViewer.tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';

interface SummaryViewerProps {
  markdown: string;
  hasCitations?: boolean;
}

const SummaryViewer: React.FC<SummaryViewerProps> = ({ markdown, hasCitations = false }) => {
  const [citationStyle, setCitationStyle] = useState<'highlighted' | 'normal' | 'hidden'>(
    hasCitations ? 'highlighted' : 'normal'
  );
  
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

  const processedMarkdown = processMarkdown(markdown);

  return (
    <div>
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
