'use client';

import { Upload, FileVideo, CheckCircle, XCircle } from 'lucide-react';

export default function VideoUploadGuide() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-[var(--card)] rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-8 h-8 text-[var(--chart-blue)]" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          How to Add Demo Videos
        </h2>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="border-l-4 border-[var(--chart-blue)] pl-4">
          <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
            Step 1: Upload Videos
          </h3>
          <p className="text-[var(--text-secondary)] mb-2">
            Place your video files in the following directory:
          </p>
          <code className="block bg-[var(--accent)] p-3 rounded text-sm">
            public/videos/demos/
          </code>
        </div>

        {/* Step 2 */}
        <div className="border-l-4 border-[var(--chart-purple)] pl-4">
          <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
            Step 2: Name Your Files Correctly
          </h3>
          <p className="text-[var(--text-secondary)] mb-3">
            Use this format: <code className="bg-[var(--accent)] px-2 py-1 rounded">category-video-title.mp4</code>
          </p>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <code className="text-sm bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  overview-platform-walkthrough.mp4
                </code>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Category: "Overview" | Title: "Platform Walkthrough"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <code className="text-sm bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  features-attendance-tracking.mp4
                </code>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Category: "Features" | Title: "Attendance Tracking"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <code className="text-sm bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                  video1.mp4
                </code>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  ❌ Not descriptive enough
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="border-l-4 border-[var(--chart-green)] pl-4">
          <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
            Available Categories
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              'overview',
              'features',
              'tutorial',
              'getting-started',
              'attendance',
              'grades',
              'fees',
              'communication',
              'reports',
              'admin',
              'teacher',
              'parent',
              'student'
            ].map((cat) => (
              <span
                key={cat}
                className="px-3 py-1 bg-[var(--accent)] text-[var(--text-secondary)] rounded text-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Supported Formats */}
        <div className="border-l-4 border-[var(--chart-orange)] pl-4">
          <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">
            Supported Formats
          </h3>
          <div className="flex flex-wrap gap-2">
            {['.mp4 (recommended)', '.webm', '.mov', '.avi', '.mkv'].map((format) => (
              <span
                key={format}
                className="flex items-center gap-1 px-3 py-1 bg-[var(--accent)] text-[var(--text-secondary)] rounded text-sm"
              >
                <FileVideo className="w-4 h-4" />
                {format}
              </span>
            ))}
          </div>
        </div>

        {/* Auto-detection */}
        <div className="bg-gradient-to-r from-[var(--chart-blue)]/10 to-[var(--chart-purple)]/10 p-4 rounded-lg">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">
            ✨ Automatic Detection
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Once you upload videos with the correct naming format, they will automatically appear on the demo page. 
            No code changes or configuration needed! The system scans the folder and generates titles and categories 
            from your filenames.
          </p>
        </div>
      </div>
    </div>
  );
}
