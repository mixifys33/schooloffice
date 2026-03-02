# Demo Videos Directory

This directory contains demo videos that are automatically displayed on the `/demo` page.

## How to Add Videos

1. **Upload your video files** to this directory (`public/videos/demos/`)
2. **Name your files** using this format: `category-video-title.mp4`
3. The system will **automatically**:
   - Detect the video
   - Extract the category and title from the filename
   - Display it on the demo page with proper formatting

## Filename Format

### Pattern: `category-title-with-dashes.extension`

### Examples:

- `overview-platform-walkthrough.mp4`
  - Category: "Overview"
  - Title: "Platform Walkthrough"

- `features-attendance-tracking.mp4`
  - Category: "Features"
  - Title: "Attendance Tracking"

- `tutorial-getting-started-guide.mp4`
  - Category: "Tutorial"
  - Title: "Getting Started Guide"

- `fees-payment-collection-demo.mp4`
  - Category: "Fees"
  - Title: "Payment Collection Demo"

## Supported Categories

The system recognizes these categories automatically:

- `overview` - General platform overviews
- `features` - Specific feature demonstrations
- `tutorial` - Step-by-step tutorials
- `getting-started` - Onboarding and setup guides
- `attendance` - Attendance management demos
- `grades` - Grade and assessment features
- `fees` - Fee collection and financial management
- `communication` - SMS, email, WhatsApp features
- `reports` - Report generation and exports
- `admin` - Administrator features
- `teacher` - Teacher portal demos
- `parent` - Parent portal features
- `student` - Student portal demos

If you use a different category name, it will still work but will be categorized as "General".

## Supported Video Formats

- `.mp4` (recommended)
- `.webm`
- `.mov`
- `.avi`
- `.mkv`

## Best Practices

1. **Use descriptive names**: `features-bulk-sms-sending.mp4` is better than `video1.mp4`
2. **Keep titles concise**: Aim for 3-5 words in the title
3. **Use lowercase**: All filenames should be lowercase with dashes
4. **Optimize file size**: Compress videos before uploading for faster loading
5. **Recommended resolution**: 1920x1080 (1080p) or 1280x720 (720p)
6. **Recommended format**: MP4 with H.264 codec for best browser compatibility

## Example Video Names

```
overview-schooloffice-introduction.mp4
features-student-enrollment.mp4
features-class-management.mp4
tutorial-first-time-setup.mp4
tutorial-adding-teachers.mp4
attendance-daily-marking.mp4
grades-report-card-generation.mp4
fees-mobile-money-payments.mp4
communication-parent-notifications.mp4
reports-financial-summary.mp4
admin-user-management.mp4
teacher-grade-entry.mp4
parent-checking-results.mp4
```

## How It Works

1. The API endpoint `/api/demo/videos` scans this directory
2. It reads all video filenames
3. It parses each filename to extract category and title
4. The demo page fetches this data and displays videos in a gallery
5. Videos are automatically organized by category
6. Users can filter by category and play videos directly on the page

## No Configuration Needed!

Just drop your videos in this folder with the correct naming format, and they'll appear automatically on the demo page. No code changes required!
