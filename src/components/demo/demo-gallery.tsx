'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, ArrowLeft, Clock } from 'lucide-react';

interface VideoItem {
  filename: string;
  title: string;
  category: string;
  duration?: string;
  thumbnail?: string;
}

export default function DemoGallery() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/demo/videos');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(videos.map(v => v.category))];
  const filteredVideos = selectedCategory === 'all' 
    ? videos 
    : videos.filter(v => v.category === selectedCategory);

  if (selectedVideo) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setSelectedVideo(null)}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to gallery
          </button>
          
          <div className="bg-[var(--card)] rounded-lg overflow-hidden shadow-lg">
            <div className="aspect-video bg-black">
              <video
                controls
                autoPlay
                className="w-full h-full"
                src={`/videos/demos/${selectedVideo.filename}`}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-6">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {selectedVideo.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                <span className="px-3 py-1 bg-[var(--accent)] rounded-full">
                  {selectedVideo.category}
                </span>
                {selectedVideo.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedVideo.duration}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--chart-blue)] to-[var(--chart-purple)] text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Demo Videos
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Watch how SchoolOffice helps schools manage academics, fees, and communication efficiently.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-[var(--chart-blue)] text-white'
                    : 'bg-[var(--accent)] text-[var(--text-secondary)] hover:bg-[var(--accent-hover)]'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Gallery */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-[var(--chart-blue)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[var(--text-secondary)]">Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)] text-lg mb-4">
              No demo videos available yet.
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Upload videos to <code className="bg-[var(--accent)] px-2 py-1 rounded">public/videos/demos/</code>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <div
                key={index}
                onClick={() => setSelectedVideo(video)}
                className="group cursor-pointer bg-[var(--card)] rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative aspect-video bg-gradient-to-br from-[var(--chart-blue)] to-[var(--chart-purple)] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-[var(--chart-blue)] ml-1" fill="currentColor" />
                    </div>
                  </div>
                  {video.thumbnail && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--chart-blue)] transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)] px-2 py-1 bg-[var(--accent)] rounded">
                      {video.category}
                    </span>
                    {video.duration && (
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {video.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
