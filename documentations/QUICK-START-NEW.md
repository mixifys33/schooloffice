# Report Card Pipeline - Quick Start Guide

## 🚀 Get Started in 1 Step!

### Just Run the Dev Server

```bash
# Windows users (recommended)
dev.bat

# Or use npm
npm run dev
```

That's it! The system will:

- ✅ Automatically generate Prisma client
- ✅ Automatically update database schema
- ✅ Start the development server
- ✅ Report Card Pipeline ready immediately!

## ✅ What You'll See

```
🔧 [PRE-DEV] Preparing development environment...
📦 [PRE-DEV] Checking Prisma client...
✅ [PRE-DEV] Prisma client is up to date
📤 [PRE-DEV] Checking database schema...
✅ [PRE-DEV] Database schema is up to date
🎉 [PRE-DEV] Development environment ready!

📋 [PRE-DEV] Report Card Pipeline is ready to use:
   → Navigate to: /dashboard/dos/curriculum/approvals
   → Click "Approve & Send Report Cards"
   → Watch console for real-time progress

▲ Next.js 16.0.10 (Turbopack)
- Local:         http://localhost:3000
✓ Ready in 2.1s
```

## 🎯 Test the System (2 minutes)

1. **Open browser**: http://localhost:3000/dashboard/dos/curriculum/approvals

2. **Select class and subject**:
   - Class: P.7
   - Subject: Mathematics

3. **Click button**: "Approve & Send Report Cards"

4. **Watch console** for real-time progress:

   ```
   🚀 [PIPELINE] Starting Report Card Pipeline
   📚 [STEP 1] Fetching students...
   ✅ [STEP 1] Found 30 students
   🧮 [STEP 2] Calculating marks...
   📄 [STEP 4] Generating PDFs...
   🎉 [PIPELINE] Pipeline completed!
   ```

5. **View results** on the page:
   - Statistics (students processed, reports generated, URLs created)
   - List of report cards with clickable URLs

6. **Test URLs**:
   - Click "View PDF" → PDF opens in browser
   - Click "Short URL" → Redirects to PDF

## ✅ Success!

You should see:

- ✅ Success message
- ✅ Statistics showing students processed
- ✅ List of report cards with URLs
- ✅ Console logs showing every step
- ✅ PDFs accessible via URLs

## 🎯 What Just Happened?

The system:

1. ✅ Fetched all students in the class
2. ✅ Calculated CA + Exam marks for each student
3. ✅ Marked all marks as approved
4. ✅ Generated report card PDFs
5. ✅ Deployed PDFs to accessible URLs
6. ✅ Created short URLs for easy sharing
7. ✅ Stored everything in database

## 📊 Check the Database

```javascript
// PDFs stored as base64
db.pdf_storage.find();

// Report card metadata
db.published_reports.find();

// Short URLs
db.short_urls.find();

// Access tracking
db.pdf_access.find();
```

## 🔍 Troubleshooting

### Issue: "No students found"

**Fix**: Ensure students are assigned to the selected class

### Issue: "No CA entries"

**Fix**: Create CA entries first in the CA assessment page

### Issue: "No Exam entries"

**Fix**: Create Exam entries first in the Exam assessment page

### Issue: Pre-dev script fails

**Fix**: Use `dev.bat` which has better error handling

### Issue: Database connection error

**Fix**: Check `.env` file for correct `DATABASE_URL`

## 📚 Documentation

- **Development Setup**: `DEVELOPMENT-SETUP.md` - Automatic Prisma integration
- **Complete Guide**: `REPORT-CARD-PIPELINE-COMPLETE.md`
- **Visual Flow**: `REPORT-CARD-PIPELINE-FLOW.md`
- **Checklist**: `REPORT-CARD-PIPELINE-CHECKLIST.md`
- **Summary**: `REPORT-CARD-PIPELINE-SUMMARY.md`

## 🎉 You're Done!

The system is now ready to:

- Approve marks
- Generate report cards
- Create live URLs
- Track access
- Store everything

**No manual setup needed - just run `dev.bat` or `npm run dev`!**

## 🚀 Next Steps

Tell me what you want to add next:

1. SMS sending to parents
2. Cloud storage (AWS S3/Google Cloud)
3. Enhanced PDF quality (Puppeteer)
4. Batch processing for large classes
5. Real-time progress updates (WebSocket)
6. Or something else!
