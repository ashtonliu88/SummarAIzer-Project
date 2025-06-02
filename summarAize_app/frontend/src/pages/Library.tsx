import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { libraryApi, SummaryPreview } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from '@/components/ui/sonner';

const Library = () => {
  const { currentUser } = useAuth();
  const [summaries, setSummaries] = useState<SummaryPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setLoading(true);
        const response = await libraryApi.getUserLibrary();
        setSummaries(response.summaries);
        setError(null);
      } catch (err) {
        console.error('Error fetching library:', err);
        setError('Failed to load your summary library. Please try again later.');
        toast.error('Error loading your library');
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-gray-600">Loading your library...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Summary Library</h1>
            <p className="text-gray-600 mt-1">
              Access your previously saved research paper summaries
            </p>
          </div>
          <Button
            className="bg-[#2261CF] hover:bg-[#1a4db3]"
            asChild
          >
            <Link to="/">Create New Summary</Link>
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {summaries.length === 0 && !error ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No saved summaries yet</h3>
            <p className="mt-2 text-gray-600">
              Get started by creating your first research paper summary
            </p>
            <div className="mt-6">
              <Button
                className="bg-[#2261CF] hover:bg-[#1a4db3]"
                asChild
              >
                <Link to="/">Create Summary</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summaries.map((summary) => (
              <Card key={summary.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-[#2261CF]">{summary.title}</CardTitle>
                  <CardDescription>{formatDate(summary.date_created)}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-gray-700 line-clamp-3">{summary.summary_preview}</p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full border-[#2261CF] text-[#2261CF] hover:bg-blue-50"
                    asChild
                  >
                    <Link to={`/summary/${summary.id}`}>View Summary</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;