import React from 'react';

interface RelatedPaper {
  title: string;
  authors: string;
  year?: number;
  abstract?: string;
  url?: string;
  venue?: string;
  citationCount?: number;
}

interface RelatedPapersProps {
  papers: RelatedPaper[];
}

const RelatedPapers: React.FC<RelatedPapersProps> = ({ papers }) => {
  if (!papers || papers.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t-2 border-blue-200">
      <h2 className="text-2xl font-bold mb-4 text-blue-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Suggested Related Papers
      </h2>
      <div className="space-y-4">
        {papers.map((paper, index) => (
          <div key={index} className="bg-gradient-to-r from-blue-100 to-indigo-100 p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-blue-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
              {paper.url ? (
                <a 
                  href={paper.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-blue-700 hover:underline flex items-start"
                >
                  <div className="bg-blue-200 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center mr-2 flex-shrink-0">
                    {index + 1}
                  </div>
                  <span>{paper.title}</span>
                </a>
              ) : (
                <div className="flex items-start">
                  <div className="bg-blue-200 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center mr-2 flex-shrink-0">
                    {index + 1}
                  </div>
                  <span>{paper.title}</span>
                </div>
              )}
            </h3>
            
            <div className="flex flex-wrap text-sm text-gray-600 mb-2 ml-8">
              {paper.authors && (
                <div className="mr-3 font-medium">{paper.authors}</div>
              )}
              {paper.year && (
                <div className="mr-3 bg-blue-50 px-2 py-0.5 rounded-md">({paper.year})</div>
              )}
              {paper.venue && (
                <div className="italic bg-indigo-50 px-2 py-0.5 rounded-md">{paper.venue}</div>
              )}
            </div>
            
            {paper.abstract && (
              <div className="text-sm text-gray-700 mb-3 ml-8 bg-white/50 p-2 rounded border-l-2 border-blue-300">
                {paper.abstract}
              </div>
            )}
            
            <div className="flex justify-between text-xs text-gray-700 ml-8">
              {paper.citationCount !== undefined && (
                <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">{paper.citationCount} citations</span>
                </div>
              )}
              {paper.url && (
                <a 
                  href={paper.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View paper
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPapers;
