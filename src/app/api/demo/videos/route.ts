import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface VideoItem {
  filename: string;
  title: string;
  category: string;
  duration?: string;
}

// Function to parse filename and extract metadata
function parseVideoFilename(filename: string): VideoItem {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(mp4|webm|mov|avi|mkv)$/i, '');
  
  // Expected format: "category-title-with-dashes.mp4"
  // Example: "overview-platform-walkthrough.mp4" -> Category: "overview", Title: "Platform Walkthrough"
  // Example: "features-attendance-tracking.mp4" -> Category: "features", Title: "Attendance Tracking"
  
  const parts = nameWithoutExt.split('-');
  
  let category = 'general';
  let titleParts = parts;
  
  // Check if first part is a known category
  const knownCategories = [
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
  ];
  
  if (parts.length > 1 && knownCategories.includes(parts[0].toLowerCase())) {
    category = parts[0];
    titleParts = parts.slice(1);
  }
  
  // Convert dashes to spaces and capitalize each word
  const title = titleParts
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return {
    filename,
    title: title || filename,
    category: category.charAt(0).toUpperCase() + category.slice(1),
  };
}

export async function GET() {
  try {
    const videosDirectory = path.join(process.cwd(), 'public', 'videos', 'demos');
    
    // Check if directory exists, if not create it
    if (!fs.existsSync(videosDirectory)) {
      fs.mkdirSync(videosDirectory, { recursive: true });
      return NextResponse.json({ 
        videos: [],
        message: 'Demo videos directory created. Please upload videos to public/videos/demos/'
      });
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(videosDirectory);
    
    // Filter for video files only
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const videoFiles = files.filter(file => 
      videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
    
    // Parse each video file
    const videos: VideoItem[] = videoFiles.map(parseVideoFilename);
    
    // Sort by category, then by title
    videos.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.title.localeCompare(b.title);
    });
    
    return NextResponse.json({ 
      videos,
      count: videos.length 
    });
    
  } catch (error) {
    console.error('Error reading demo videos:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load demo videos',
        videos: [] 
      },
      { status: 500 }
    );
  }
}
