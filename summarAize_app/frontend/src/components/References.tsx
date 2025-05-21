import React, { useState } from 'react';

interface ReferencesProps {
  references: string[];
}

const References: React.FC<ReferencesProps> = ({ references }) => {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  if (!references || references.length === 0) {
    return null;
  }
  
  // Sort references numerically if they start with numbers
  const sortedReferences = [...references].sort((a, b) => {
    const aNum = parseInt(a.match(/^\[?(\d+)\]?/)?.[1] || '999');
    const bNum = parseInt(b.match(/^\[?(\d+)\]?/)?.[1] || '999');
    return aNum - bNum;
  });
  
  // Filter references based on search query
  const filteredReferences = searchQuery 
    ? sortedReferences.filter(ref => ref.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedReferences;
    
  // Initial limit of references to show
  const initialDisplayCount = 10;
  
  // Divide references into sections for easier navigation
  const sectionSize = 20;
  const sections = [];
  for (let i = 0; i < filteredReferences.length; i += sectionSize) {
    sections.push(filteredReferences.slice(i, i + sectionSize));
  }
  
  // Determine which references to show
  const referencesToShow = searchQuery 
    ? filteredReferences 
    : (showAll 
        ? filteredReferences 
        : (selectedSection !== null 
            ? sections[selectedSection] 
            : filteredReferences.slice(0, initialDisplayCount)
          )
      );

  return (
    <div className="mt-8 pt-6 border-t-2 border-indigo-200">
      <h2 className="text-2xl font-bold mb-4 text-indigo-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        References ({filteredReferences.length})
      </h2>
      
      {/* Search and Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search references..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowAll(true); // Show all when searching
            }}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
        
        {sections.length > 1 && !searchQuery && (
          <div className="flex flex-wrap gap-2">
            {sections.map((_, index) => (
              <button
                key={index}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedSection === index
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                }`}
                onClick={() => {
                  setSelectedSection(index);
                  setShowAll(false);
                }}
              >
                {index * sectionSize + 1}-{Math.min((index + 1) * sectionSize, references.length)}
              </button>
            ))}
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                showAll
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
              }`}
              onClick={() => {
                setShowAll(true);
                setSelectedSection(null);
              }}
            >
              All
            </button>
          </div>
        )}
      </div>

      {/* Results count when searching */}
      {searchQuery && (
        <p className="mb-4 text-gray-600">
          Found {filteredReferences.length} references matching "{searchQuery}"
        </p>
      )}
      
      {/* References list */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-lg shadow border border-indigo-100">
        <ol className="list-none space-y-3">
          {referencesToShow.map((reference, index) => (
            <li key={index} className="flex items-start">
              <div className="bg-indigo-200 text-indigo-800 rounded-full h-6 w-6 flex items-center justify-center mr-2 flex-shrink-0">
                {/* Extract reference number if present, otherwise use index */}
                {reference.match(/^\[?(\d+)\]?/)?.[1] || index + 1}
              </div>
              <div className="text-gray-800 text-sm">
                {/* Highlight the search query in the reference text */}
                {searchQuery ? (
                  highlightSearchTerm(reference, searchQuery)
                ) : (
                  reference
                )}
              </div>
            </li>
          ))}
        </ol>
        
        {/* Show/Hide all button */}
        {!searchQuery && !showAll && filteredReferences.length > initialDisplayCount && selectedSection === null && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Show all {filteredReferences.length} references
            </button>
          </div>
        )}
        
        {/* Show Less button */}
        {!searchQuery && showAll && filteredReferences.length > initialDisplayCount && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowAll(false);
                setSelectedSection(null);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Show less
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to highlight search term in reference text
const highlightSearchTerm = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return parts.map((part, index) => 
    part.toLowerCase() === searchTerm.toLowerCase() 
      ? <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> 
      : part
  );
};

export default References;
