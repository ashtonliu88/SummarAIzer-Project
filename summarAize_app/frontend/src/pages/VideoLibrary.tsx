// src/pages/VideoLibrary.tsx
import React, { useState, useEffect } from 'react';
import { Download, Trash2, Video, Calendar, File, Search, Filter, Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { videoApi } from '@/services/api';
import Navbar from '@/components/Navbar';

interface UserVideo {
  video_name: string;
  storage_path: string;
  download_url: string;
  size: number;
  created_at?: string;
  updated_at?: string;
}

const VideoLibrary: React.FC = () => {
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadUserVideos();
  }, []);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, searchTerm, sortBy, sortOrder]);

  const loadUserVideos = async () => {
    try {
      setLoading(true);
      const response = await videoApi.getUserVideos();
      setVideos(response.videos);
    } catch (error) {
      console.error('Error loading user videos:', error);
      toast.error('Failed to load your videos');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVideos = () => {
    let filtered = videos.filter(video =>
      video.video_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort videos
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.video_name.toLowerCase();
          bValue = b.video_name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredVideos(filtered);
  };

  const handleDownload = async (video: UserVideo) => {
    try {
      const link = document.createElement('a');
      link.href = video.download_url;
      link.download = video.video_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download video');
    }
  };

  const handleDelete = async (videoName: string) => {
    if (!confirm(`Are you sure you want to delete "${videoName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(videoName);
      await videoApi.deleteVideo(videoName);
      setVideos(videos.filter(v => v.video_name !== videoName));
      toast.success('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalSize = (): string => {
    const total = videos.reduce((sum, video) => sum + video.size, 0);
    return formatFileSize(total);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Library</h1>
          <p className="text-gray-600">
            Manage all your generated videos. Total: {videos.length} videos ({getTotalSize()})
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              {searchTerm ? (
                <>
                  <p className="text-gray-500 mb-2">No videos found matching "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-2">No videos generated yet</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Start by uploading a PDF and generating your first video
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UploadIcon className="w-4 h-4" />
                    <span>Upload PDF</span>
                  </a>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredVideos.map((video, index) => (
                <div
                  key={video.video_name}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Video className="h-10 w-10 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {video.video_name}
                        </h3>
                        <div className="flex items-center space-x-6 mt-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <File className="h-4 w-4 mr-1" />
                            {formatFileSize(video.size)}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(video.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleDownload(video)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download video"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(video.video_name)}
                        disabled={deleteLoading === video.video_name}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete video"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {filteredVideos.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={loadUserVideos}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              Refresh videos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLibrary;
