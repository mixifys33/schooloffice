# Report Card Pipeline - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Setup Database (2 minutes)

```bash
# Run the setup script
setup-report-card-pipeline.bat
```

This will:

- Generate Prisma client
- Update database schema
- Add new models (PDFStorage, PDFAccess, PublishedReport)

### Step 2: Start Server (1 minute)

```bash
npm run dev
```

Wait for: `✓ Ready in X.Xs`

### Step 3: Test the System (5 minutes)

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
- ✅ Statistics showing 30/30 students processed
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

### Issue: Prisma errors

**Fix**: Run `setup-report-card-pipeline.bat` again

## 📚 Documentation

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

**Next**: Tell me what you want to add next (SMS sending, cloud storage, etc.)
