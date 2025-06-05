// src/components/UserVideos.tsx
import React, { useState, useEffect } from 'react';
import { Download, Trash2, Video, Calendar, File } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { videoApi } from '@/services/api';

interface UserVideo {
  video_name: string;
  storage_path: string;
  download_url: string;
  size: number;
  created_at?: string;
  updated_at?: string;
}

const UserVideos: React.FC = () => {
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUserVideos();
  }, []);

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

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Videos</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Videos</h3>
        <span className="text-sm text-gray-500">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-8">
          <Video className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No videos generated yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Generate your first video by uploading a PDF above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.video_name}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0">
                  <Video className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {video.video_name}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <File className="h-3 w-3 mr-1" />
                      {formatFileSize(video.size)}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(video.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(video)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download video"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(video.video_name)}
                  disabled={deleteLoading === video.video_name}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete video"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={loadUserVideos}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Refresh list
          </button>
        </div>
      )}
    </div>
  );
};

export default UserVideos;
