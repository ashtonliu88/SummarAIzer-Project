import React from 'react';

interface Keyword {
  keyword: string;
  score: number;
  explanation: string;
}

interface KeywordsProps {
  keywords: Keyword[];
}

const Keywords: React.FC<KeywordsProps> = ({ keywords }) => {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  // Sort keywords by score (descending)
  const sortedKeywords = [...keywords].sort((a, b) => b.score - a.score);

  return (
    <div className="mt-8 pt-6 border-t-2 border-purple-200">
      <h2 className="text-2xl font-bold mb-4 text-purple-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Key Concepts ({keywords.length})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedKeywords.map((item, index) => (
          <div key={index} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-md border border-purple-100 overflow-hidden">
            <div className="flex items-center bg-purple-100 px-4 py-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold mr-3">
                {item.score}
              </div>
              <h3 className="text-lg font-semibold text-purple-900">{item.keyword}</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              {item.explanation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Keywords;
