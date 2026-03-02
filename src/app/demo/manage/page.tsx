import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import VideoUploadGuide from '@/components/demo/video-upload-guide';

export const metadata: Metadata = {
  title: 'Manage Demo Videos - SchoolOffice.academy',
  description: 'Learn how to upload and manage demo videos for SchoolOffice.',
};

export default function ManageDemoPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="bg-gradient-to-br from-[var(--chart-blue)] to-[var(--chart-purple)] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to demo gallery
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Manage Demo Videos
          </h1>
          <p className="text-white/90">
            Upload and organize your demo videos with automatic title generation
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <VideoUploadGuide />
        
        <div className="mt-8 p-6 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4">
            Quick Examples
          </h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-[var(--text-primary)] mb-2">Filename:</p>
                <code className="block bg-[var(--accent)] p-2 rounded">
                  overview-complete-platform-tour.mp4
                </code>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)] mb-2">Result:</p>
                <div className="bg-[var(--accent)] p-2 rounded">
                  <p className="text-[var(--text-secondary)]">Category: <span className="font-medium">Overview</span></p>
                  <p className="text-[var(--text-secondary)]">Title: <span className="font-medium">Complete Platform Tour</span></p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-[var(--text-primary)] mb-2">Filename:</p>
                <code className="block bg-[var(--accent)] p-2 rounded">
                  fees-mobile-money-integration.mp4
                </code>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)] mb-2">Result:</p>
                <div className="bg-[var(--accent)] p-2 rounded">
                  <p className="text-[var(--text-secondary)]">Category: <span className="font-medium">Fees</span></p>
                  <p className="text-[var(--text-secondary)]">Title: <span className="font-medium">Mobile Money Integration</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link
            href="/demo"
            className="px-6 py-3 bg-[var(--chart-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            View Demo Gallery
          </Link>
          <a
            href="/videos/demos/README.md"
            target="_blank"
            className="px-6 py-3 bg-[var(--accent)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            View Full Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
