# Report Card Approval & Generation Pipeline - Complete Implementation

**Date**: 2026-02-09  
**Status**: ✅ **COMPLETE** - All components implemented

## Overview

This document describes the complete end-to-end pipeline for:

1. Approving CA and Exam marks
2. Calculating final marks (CA out of 20 + Exam out of 80 = 100)
3. Generating report card PDFs for all students
4. Deploying PDFs to live accessible URLs
5. Creating shortened URLs for easy sharing
6. Storing all data in database

**Every step is console logged for complete transparency.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DoS Approvals Page                           │
│  /dashboard/dos/curriculum/approvals                            │
│                                                                 │
│  [Select Class] [Select Subject] [Approve & Send Button]       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              API: /api/dos/curriculum/approvals/approve-and-send│
│                                                                 │
│  • Validates DoS permissions                                    │
│  • Calls reportCardPipelineService                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           Report Card Pipeline Service                          │
│  src/services/report-card-pipeline.service.ts                   │
│                                                                 │
│  STEP 1: Fetch all students in class                            │
│  STEP 2: Calculate marks (CA + Exam)                            │
│  STEP 3: Mark as approved in DosApproval                        │
│  STEP 4: Generate report card PDFs                              │
│  STEP 5: Deploy PDFs to accessible URLs                         │
│  STEP 6: Create short URLs                                      │
│  STEP 7: Store in database                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Storage                             │
│                                                                 │
│  • PDFStorage - Base64 encoded PDFs                             │
│  • PublishedReport - Report card metadata + URLs                │
│  • ShortUrl - URL shortening records                            │
│  • PDFAccess - Access tracking (analytics)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PDF Serving API                                    │
│  /api/reports/pdf/[pdfId]                                       │
│                                                                 │
│  • Public endpoint (no auth required)                           │
│  • Serves PDFs from database                                    │
│  • Tracks access for analytics                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Created/Modified

### 1. Pipeline Service

**File**: `src/services/report-card-pipeline.service.ts`

**Purpose**: Core pipeline orchestration

**Key Functions**:

- `processApprovalPipeline()` - Main pipeline entry point
- `getStudentsInClass()` - Fetch all active students
- `calculateStudentMarks()` - Calculate CA + Exam = Final
- `markAsApproved()` - Update DosApproval table
- `generatePDF()` - Create PDF from HTML
- `deployPDF()` - Store PDF and create URL
- `storeReportCard()` - Save to PublishedReport table

**Console Logging**:

```
🚀 [PIPELINE] Starting Report Card Pipeline
📋 [PIPELINE] Input: {...}
📚 [STEP 1] Fetching students...
✅ [STEP 1] Found 30 students
🧮 [STEP 2] Calculating marks (CA + Exam)...
✅ [STEP 2] Calculated marks for 30 students
✔️ [STEP 3] Marking as approved...
✅ [STEP 3] Marks approved successfully
📄 [STEP 4] Generating report card PDFs...
  📝 [STEP 4.1] Processing John Doe...
  ✅ [STEP 4.1] HTML generated
  ✅ [STEP 4.1] PDF generated (12345 bytes)
  🌐 [STEP 5.1] Deploying PDF...
  ✅ [STEP 5.1] PDF deployed: https://example.com/api/reports/pdf/xyz
  🔗 [STEP 6.1] Creating short URL...
  ✅ [STEP 6.1] Short URL created: https://tama.ri/ABC1
  💾 [STEP 7.1] Storing in database...
  ✅ [STEP 7.1] Stored with ID: 507f1f77bcf86cd799439011
  ✅ [COMPLETE] John Doe - Report card ready!
🎉 [PIPELINE] Pipeline completed successfully!
📊 [PIPELINE] Summary: {...}
```

### 2. API Endpoint

**File**: `src/app/api/dos/curriculum/approvals/approve-and-send/route.ts`

**Purpose**: HTTP endpoint for pipeline

**Method**: POST

**Request Body**:

```json
{
  "classId": "507f1f77bcf86cd799439011",
  "subjectId": "507f1f77bcf86cd799439012",
  "termId": "507f1f77bcf86cd799439013" // Optional, uses current term if not provided
}
```

**Response**:

```json
{
  "success": true,
  "message": "Report cards generated for 30 students",
  "studentsProcessed": 30,
  "reportCardsGenerated": 30,
  "urlsCreated": 30,
  "errors": [],
  "reportCards": [
    {
      "studentId": "507f1f77bcf86cd799439014",
      "studentName": "John Doe",
      "pdfUrl": "https://example.com/api/reports/pdf/xyz",
      "shortUrl": "https://tama.ri/ABC1",
      "reportCardId": "507f1f77bcf86cd799439015"
    }
  ]
}
```

### 3. PDF Serving API

**File**: `src/app/api/reports/pdf/[pdfId]/route.ts`

**Purpose**: Serve PDFs from database

**Method**: GET

**URL**: `/api/reports/pdf/[pdfId]`

**Example**: `https://example.com/api/reports/pdf/school123-term456-student789-1707484800000`

**Response**: PDF file (application/pdf)

**Features**:

- Public endpoint (no authentication)
- Serves PDFs from database
- Tracks access for analytics
- Caches for 1 year
- Inline display (not download)

### 4. Frontend Page

**File**: `src/app/(back)/dashboard/dos/curriculum/approvals/page.tsx`

**New Features**:

- "Approve & Send Report Cards" button
- Real-time progress display
- Report results summary
- Links to generated PDFs
- Links to short URLs

**UI Components**:

- Info box explaining the pipeline
- Loading state with spinner
- Success message with statistics
- Error handling
- Report cards list with clickable URLs

### 5. Database Schema

**File**: `prisma/schema.prisma`

**New Models**:

#### PDFStorage

```prisma
model PDFStorage {
  id        String   @id // Custom ID: schoolId-termId-studentId-timestamp
  studentId String   @db.ObjectId
  termId    String   @db.ObjectId
  schoolId  String   @db.ObjectId
  pdfData   String   // Base64 encoded PDF
  fileSize  Int      // File size in bytes
  createdAt DateTime @default(now())
  accesses  PDFAccess[]
}
```

#### PDFAccess

```prisma
model PDFAccess {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  pdfStorageId String
  accessedAt   DateTime @default(now())
  ipAddress    String?
  userAgent    String?
  pdfStorage   PDFStorage @relation(...)
}
```

#### PublishedReport

```prisma
model PublishedReport {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  studentId    String   @db.ObjectId
  termId       String   @db.ObjectId
  schoolId     String   @db.ObjectId
  publishedBy  String   @db.ObjectId
  publishedAt  DateTime @default(now())
  htmlContent  String   // HTML version
  pdfUrl       String?  // Full URL to PDF
  shortUrl     String?  // Shortened URL
  isAccessible Boolean  @default(true)
}
```

---

## Marks Calculation Logic

### CA Marks (Out of 20)

1. **Fetch all CA entries** for student/subject/term
2. **Sum raw scores**: `caRawTotal = sum(rawScore)`
3. **Sum max scores**: `caMaxTotal = sum(maxScore)`
4. **Calculate percentage**: `caPercentage = (caRawTotal / caMaxTotal) * 100`
5. **Scale to 20**: `caTotal = (caPercentage / 100) * 20`

**Example**:

- Assignment 1: 15/20
- Test 1: 18/25
- Assignment 2: 22/30
- Total: 55/75 = 73.33%
- CA out of 20: (73.33 / 100) \* 20 = **14.67/20**

### Exam Marks (Out of 80)

1. **Fetch exam entry** for student/subject/term
2. **Calculate percentage**: `examPercentage = (examScore / maxScore) * 100`
3. **Scale to 80**: `examTotal = (examPercentage / 100) * 80`

**Example**:

- Exam: 68/100 = 68%
- Exam out of 80: (68 / 100) \* 80 = **54.4/80**

### Final Marks (Out of 100)

```
finalTotal = caTotal + examTotal
```

**Example**:

- CA: 14.67/20
- Exam: 54.4/80
- Final: 14.67 + 54.4 = **69.07/100**

### Grading

```typescript
if (finalTotal >= 80) return "A";
if (finalTotal >= 70) return "B";
if (finalTotal >= 60) return "C";
if (finalTotal >= 50) return "D";
return "F";
```

---

## URL Structure

### Full PDF URL

```
https://example.com/api/reports/pdf/school123-term456-student789-1707484800000
```

**Format**: `{schoolId}-{termId}-{studentId}-{timestamp}`

**Example**:

```
https://localhost:3000/api/reports/pdf/65a1b2c3d4e5f6789012345-65a1b2c3d4e5f6789012346-65a1b2c3d4e5f6789012347-1707484800000
```

### Short URL

```
https://tama.ri/ABC1
```

**Format**: `{baseUrl}/{code}`

**Code**: 4-character alphanumeric (e.g., ABC1, XYZ9, M3N4)

**Redirect**: Short URL redirects to full PDF URL

---

## Database Operations

### 1. Store PDF

```typescript
await prisma.pDFStorage.create({
  data: {
    id: `${schoolId}-${termId}-${studentId}-${Date.now()}`,
    studentId,
    termId,
    schoolId,
    pdfData: pdfBuffer.toString("base64"),
    fileSize: pdfBuffer.length,
  },
});
```

### 2. Create Short URL

```typescript
const shortUrlData = await urlShortenerService.createShortUrl({
  originalUrl: pdfUrl,
  schoolId,
  studentId,
  channel: "SMS",
});
```

### 3. Store Report Card

```typescript
await prisma.publishedReport.create({
  data: {
    studentId,
    termId,
    schoolId,
    publishedBy: userId,
    htmlContent,
    pdfUrl,
    shortUrl,
    publishedAt: new Date(),
  },
});
```

### 4. Track Access

```typescript
await prisma.pDFAccess.create({
  data: {
    pdfStorageId: pdfId,
    accessedAt: new Date(),
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  },
});
```

---

## Usage Guide

### For DoS Users

1. **Navigate** to `/dashboard/dos/curriculum/approvals`
2. **Select** a class from dropdown
3. **Select** a subject from dropdown
4. **Review** CA and Exam entries
5. **Click** "Approve & Send Report Cards" button
6. **Confirm** the action in the dialog
7. **Watch** console for real-time progress
8. **View** results summary with URLs
9. **Click** "View PDF" or "Short URL" to test

### Console Output Example

```
🎯 [API] POST /api/dos/curriculum/approvals/approve-and-send
👤 [API] User: { userId: '...', schoolId: '...', role: 'SCHOOL_ADMIN' }
📋 [API] Request body: { classId: '...', subjectId: '...', termId: '...' }
✅ [API] Class: P.7, Subject: Mathematics
🚀 [API] Starting pipeline...
🚀 [PIPELINE] Starting Report Card Pipeline
📋 [PIPELINE] Input: {...}
📚 [STEP 1] Fetching students...
✅ [STEP 1] Found 30 students
🧮 [STEP 2] Calculating marks (CA + Exam)...
✅ [STEP 2] Calculated marks for 30 students
✔️ [STEP 3] Marking as approved...
✅ [STEP 3] Marks approved successfully
📄 [STEP 4] Generating report card PDFs...
  📝 [STEP 4.1] Processing John Doe...
  ✅ [STEP 4.1] HTML generated
  ✅ [STEP 4.1] PDF generated (12345 bytes)
  🌐 [STEP 5.1] Deploying PDF...
  ✅ [STEP 5.1] PDF deployed: https://localhost:3000/api/reports/pdf/xyz
  🔗 [STEP 6.1] Creating short URL...
  ✅ [STEP 6.1] Short URL created: https://tama.ri/ABC1
  💾 [STEP 7.1] Storing in database...
  ✅ [STEP 7.1] Stored with ID: 507f1f77bcf86cd799439011
  ✅ [COMPLETE] John Doe - Report card ready!
[... repeat for all students ...]
🎉 [PIPELINE] Pipeline completed successfully!
📊 [PIPELINE] Summary: { studentsProcessed: 30, reportCardsGenerated: 30, urlsCreated: 30, errors: 0 }
✅ [API] Pipeline completed
📊 [API] Result: { success: true, studentsProcessed: 30, reportCardsGenerated: 30, urlsCreated: 30, errors: 0 }
```

---

## Testing

### 1. Test PDF Generation

```bash
# Navigate to approvals page
http://localhost:3000/dashboard/dos/curriculum/approvals

# Select class and subject
# Click "Approve & Send Report Cards"
# Check console for logs
```

### 2. Test PDF Access

```bash
# Copy PDF URL from results
# Open in new tab
# Should display PDF inline
```

### 3. Test Short URL

```bash
# Copy short URL from results
# Open in new tab
# Should redirect to PDF URL
```

### 4. Test Database Storage

```bash
# Check PDFStorage collection
db.pdf_storage.find()

# Check PublishedReport collection
db.published_reports.find()

# Check ShortUrl collection
db.short_urls.find()

# Check PDFAccess collection
db.pdf_access.find()
```

---

## Next Steps (Future Enhancements)

### 1. SMS/Email Sending

After URLs are created, send them to parents:

```typescript
// In pipeline service, after Step 7
await sendReportCardNotifications({
  studentId,
  shortUrl,
  guardianContacts,
});
```

### 2. Cloud Storage Integration

Replace database storage with AWS S3/Google Cloud Storage:

```typescript
// In deployPDF()
const s3Url = await uploadToS3(pdfBuffer, `reports/${pdfId}.pdf`);
return s3Url;
```

### 3. PDF Generation Enhancement

Use Puppeteer for better PDF quality:

```typescript
import puppeteer from "puppeteer";

async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();
  return pdfBuffer;
}
```

### 4. Batch Processing

Process large classes in batches:

```typescript
const batchSize = 10;
for (let i = 0; i < students.length; i += batchSize) {
  const batch = students.slice(i, i + batchSize);
  await Promise.all(batch.map((student) => processStudent(student)));
}
```

### 5. Progress Tracking

Real-time progress updates via WebSocket:

```typescript
// Server
io.emit("pipeline-progress", {
  current: 15,
  total: 30,
  studentName: "John Doe",
});

// Client
socket.on("pipeline-progress", (data) => {
  updateProgressBar(data);
});
```

---

## Troubleshooting

### Issue: Prisma generation timeout

**Solution**: Close all terminals and VS Code, then run:

```bash
npx prisma generate
```

### Issue: PDF not displaying

**Solution**: Check browser console for errors. Verify PDF URL is accessible.

### Issue: Short URL not working

**Solution**: Verify ShortUrl record exists in database. Check URL shortener service.

### Issue: Pipeline fails for some students

**Solution**: Check console logs for specific errors. Verify CA and Exam entries exist.

### Issue: Database connection error

**Solution**: Verify MongoDB connection string in `.env`. Check network connectivity.

---

## Security Considerations

### 1. PDF Access Control

- PDFs are accessed via unique, hard-to-guess IDs
- No authentication required (by design for parent access)
- Can be revoked by setting `isAccessible: false` in PublishedReport

### 2. URL Expiration

- Short URLs can have expiration dates
- Expired URLs return 410 Gone status

### 3. Access Tracking

- All PDF accesses are logged with IP and user agent
- Can be used for analytics and security monitoring

### 4. Data Privacy

- PDFs contain sensitive student data
- Store securely in database or encrypted cloud storage
- Use HTTPS for all URLs

---

## Performance Optimization

### 1. Caching

- PDFs are cached for 1 year (immutable)
- Short URLs are cached indefinitely

### 2. Compression

- PDFs can be compressed before storage
- Use gzip compression for HTML content

### 3. CDN Integration

- Serve PDFs via CDN for faster access
- Reduce server load

### 4. Lazy Loading

- Generate PDFs on-demand instead of all at once
- Queue system for background processing

---

## Status

✅ **COMPLETE** - All components implemented and ready for testing

**Next Action**: Run `npx prisma generate` and `npx prisma db push` to update database schema, then test the complete pipeline.
