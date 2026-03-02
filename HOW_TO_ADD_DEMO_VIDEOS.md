# 🎬 How to Add Demo Videos - Quick Guide

## 📍 Where to Upload

Upload your videos to this folder:

```
public/videos/demos/
```

## 📝 How to Name Files

### Format: `category-video-title.mp4`

### ✅ Good Examples:

| Filename                            | Result                                                    |
| ----------------------------------- | --------------------------------------------------------- |
| `overview-platform-walkthrough.mp4` | **Category:** Overview<br>**Title:** Platform Walkthrough |
| `features-attendance-tracking.mp4`  | **Category:** Features<br>**Title:** Attendance Tracking  |
| `tutorial-getting-started.mp4`      | **Category:** Tutorial<br>**Title:** Getting Started      |
| `fees-mobile-money-payments.mp4`    | **Category:** Fees<br>**Title:** Mobile Money Payments    |

### ❌ Bad Examples:

| Filename                  | Problem                 |
| ------------------------- | ----------------------- |
| `video1.mp4`              | Not descriptive         |
| `My Video.mp4`            | Has spaces (use dashes) |
| `DEMO_VIDEO.mp4`          | Use lowercase           |
| `attendance tracking.mp4` | Has spaces (use dashes) |

## 🏷️ Available Categories

Use these as the first part of your filename:

- `overview` - Platform overviews and introductions
- `features` - Specific feature demonstrations
- `tutorial` - Step-by-step tutorials
- `getting-started` - Onboarding guides
- `attendance` - Attendance management
- `grades` - Grade and assessment features
- `fees` - Fee collection and payments
- `communication` - SMS, email, WhatsApp
- `reports` - Report generation
- `admin` - Administrator features
- `teacher` - Teacher portal demos
- `parent` - Parent portal features
- `student` - Student portal demos

## 🎥 Supported Formats

- ✅ `.mp4` (recommended)
- ✅ `.webm`
- ✅ `.mov`
- ✅ `.avi`
- ✅ `.mkv`

## 🚀 That's It!

Once you upload a video with the correct name:

1. It automatically appears on `/demo` page
2. Title is generated from filename
3. Category is extracted automatically
4. No code changes needed!

## 🔗 Helpful Links

- **View Demo Gallery:** [/demo](/demo)
- **Management Guide:** [/demo/manage](/demo/manage)
- **Full Documentation:** [public/videos/demos/README.md](public/videos/demos/README.md)

## 💡 Pro Tips

1. **Keep it short:** 1-3 minutes per video
2. **Optimize size:** Compress before uploading
3. **Use 1080p or 720p:** Best quality/size balance
4. **MP4 format:** Best browser compatibility
5. **Clear audio:** Use good microphone
6. **Add captions:** For accessibility

## 📋 Quick Checklist

Before uploading, make sure:

- [ ] Video is in MP4 format
- [ ] Filename uses dashes (not spaces)
- [ ] Filename is lowercase
- [ ] Category is first (e.g., `features-`)
- [ ] Title is descriptive
- [ ] File size is reasonable (under 50MB)
- [ ] Video quality is good (720p or 1080p)

## 🎯 Example Workflow

1. **Record** your demo video
2. **Edit** and compress it
3. **Name** it: `features-student-enrollment.mp4`
4. **Upload** to `public/videos/demos/`
5. **Visit** `/demo` to see it live!

---

**Need help?** Check the full documentation in `DEMO_VIDEO_SYSTEM.md`
