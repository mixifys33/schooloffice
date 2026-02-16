# Report Card Pipeline - Visual Flow

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  👤 DoS User: "I want to approve marks and send report cards"          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🖥️  DoS Approvals Page                                                 │
│  /dashboard/dos/curriculum/approvals                                    │
│                                                                         │
│  [Select Class: P.7] [Select Subject: Mathematics]                     │
│                                                                         │
│  📊 CA Entries: 3 entries, 30 students                                  │
│  📊 Exam Entries: 30 students                                           │
│                                                                         │
│  [🚀 Approve & Send Report Cards] ← User clicks this                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🔐 API: /api/dos/curriculum/approvals/approve-and-send                 │
│                                                                         │
│  ✅ Verify DoS permissions                                              │
│  ✅ Validate class and subject exist                                    │
│  ✅ Get current term                                                    │
│  ✅ Call pipeline service                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚙️  Pipeline Service: reportCardPipelineService                        │
│                                                                         │
│  📚 STEP 1: Fetch Students                                              │
│     └─> Query: Student.findMany({ classId, status: ACTIVE })           │
│     └─> Result: 30 students                                            │
│                                                                         │
│  🧮 STEP 2: Calculate Marks                                             │
│     For each student:                                                   │
│     ├─> Get CA entries (all assignments/tests)                         │
│     │   └─> Assignment 1: 15/20                                        │
│     │   └─> Test 1: 18/25                                              │
│     │   └─> Assignment 2: 22/30                                        │
│     │   └─> Total: 55/75 = 73.33%                                      │
│     │   └─> CA out of 20: 14.67/20                                     │
│     │                                                                   │
│     ├─> Get Exam entry                                                 │
│     │   └─> Exam: 68/100 = 68%                                         │
│     │   └─> Exam out of 80: 54.4/80                                    │
│     │                                                                   │
│     └─> Final = CA + Exam                                              │
│         └─> 14.67 + 54.4 = 69.07/100                                   │
│         └─> Grade: B                                                   │
│                                                                         │
│  ✔️  STEP 3: Mark as Approved                                           │
│     └─> Update DosApproval: caApproved=true, examApproved=true         │
│                                                                         │
│  📄 STEP 4-7: For each student (30 iterations)                          │
│     │                                                                   │
│     ├─> 📝 Generate HTML                                                │
│     │   └─> resultsService.generateReportCardHTML()                    │
│     │   └─> HTML with student details, marks, grades                   │
│     │                                                                   │
│     ├─> 🖨️  Generate PDF                                                │
│     │   └─> Convert HTML to PDF buffer                                 │
│     │   └─> Size: 12,345 bytes                                         │
│     │                                                                   │
│     ├─> 🌐 Deploy PDF                                                   │
│     │   └─> Convert to base64                                          │
│     │   └─> Store in PDFStorage table                                  │
│     │   └─> ID: school123-term456-student789-1707484800000             │
│     │   └─> URL: https://localhost:3000/api/reports/pdf/[id]           │
│     │                                                                   │
│     ├─> 🔗 Create Short URL                                             │
│     │   └─> urlShortenerService.createShortUrl()                       │
│     │   └─> Code: ABC1                                                 │
│     │   └─> Short URL: https://tama.ri/ABC1                            │
│     │                                                                   │
│     └─> 💾 Store Report Card                                            │
│         └─> PublishedReport.create()                                   │
│         └─> Save: studentId, termId, pdfUrl, shortUrl, htmlContent     │
│         └─> ID: 507f1f77bcf86cd799439011                               │
│                                                                         │
│  🎉 Pipeline Complete!                                                  │
│     └─> 30 students processed                                          │
│     └─> 30 report cards generated                                      │
│     └─> 30 URLs created                                                │
│     └─> 0 errors                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 API Response                                                        │
│                                                                         │
│  {                                                                      │
│    "success": true,                                                     │
│    "message": "Report cards generated for 30 students",                 │
│    "studentsProcessed": 30,                                             │
│    "reportCardsGenerated": 30,                                          │
│    "urlsCreated": 30,                                                   │
│    "errors": [],                                                        │
│    "reportCards": [                                                     │
│      {                                                                  │
│        "studentId": "...",                                              │
│        "studentName": "John Doe",                                       │
│        "pdfUrl": "https://localhost:3000/api/reports/pdf/...",          │
│        "shortUrl": "https://tama.ri/ABC1",                              │
│        "reportCardId": "507f1f77bcf86cd799439011"                       │
│      },                                                                 │
│      ... (29 more students)                                             │
│    ]                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🖥️  Frontend Display                                                   │
│                                                                         │
│  ✅ Report Cards Generated Successfully!                                │
│                                                                         │
│  📊 Statistics:                                                         │
│     ┌─────────────┬─────────────┬─────────────┐                        │
│     │ 30 Students │ 30 Reports  │ 30 URLs     │                        │
│     │ Processed   │ Generated   │ Created     │                        │
│     └─────────────┴─────────────┴─────────────┘                        │
│                                                                         │
│  📋 Generated Report Cards:                                             │
│     ┌────────────────────────────────────────────────────┐             │
│     │ John Doe                                           │             │
│     │ ID: 507f1f77bcf86cd799439011                       │             │
│     │ [View PDF] [Short URL]                             │             │
│     └────────────────────────────────────────────────────┘             │
│     ┌────────────────────────────────────────────────────┐             │
│     │ Jane Smith                                         │             │
│     │ ID: 507f1f77bcf86cd799439012                       │             │
│     │ [View PDF] [Short URL]                             │             │
│     └────────────────────────────────────────────────────┘             │
│     ... (28 more students)                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  💾 Database State                                                      │
│                                                                         │
│  📦 PDFStorage (30 records)                                             │
│     ├─> school123-term456-student789-1707484800000                     │
│     │   └─> pdfData: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0..."   │
│     │   └─> fileSize: 12345                                            │
│     └─> ... (29 more)                                                  │
│                                                                         │
│  📦 PublishedReport (30 records)                                        │
│     ├─> 507f1f77bcf86cd799439011                                       │
│     │   └─> studentId: "..."                                           │
│     │   └─> pdfUrl: "https://localhost:3000/api/reports/pdf/..."       │
│     │   └─> shortUrl: "https://tama.ri/ABC1"                           │
│     └─> ... (29 more)                                                  │
│                                                                         │
│  📦 ShortUrl (30 records)                                               │
│     ├─> ABC1 → https://localhost:3000/api/reports/pdf/...              │
│     ├─> ABC2 → https://localhost:3000/api/reports/pdf/...              │
│     └─> ... (28 more)                                                  │
│                                                                         │
│  📦 DosApproval (1 record updated)                                      │
│     └─> classId: P.7, subjectId: Mathematics                           │
│         └─> caApproved: true                                           │
│         └─> examApproved: true                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🌐 URLs Are Now Live!                                                  │
│                                                                         │
│  Anyone with the URL can access the PDF:                                │
│                                                                         │
│  Full URL:                                                              │
│  https://localhost:3000/api/reports/pdf/school123-term456-student789-... │
│                                                                         │
│  Short URL:                                                             │
│  https://tama.ri/ABC1                                                   │
│                                                                         │
│  Both URLs serve the same PDF ✅                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  👨‍👩‍👧‍👦 Parent Access                                                      │
│                                                                         │
│  Parent receives SMS:                                                   │
│  "Your child's report card is ready: https://tama.ri/ABC1"             │
│                                                                         │
│  Parent clicks link → PDF opens in browser                              │
│                                                                         │
│  📊 Access is tracked:                                                  │
│     └─> PDFAccess.create()                                             │
│         └─> pdfStorageId: "..."                                        │
│         └─> accessedAt: 2026-02-09 14:30:00                            │
│         └─> ipAddress: "192.168.1.100"                                 │
│         └─> userAgent: "Mozilla/5.0..."                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Console Output Flow

```
🎯 [API] POST /api/dos/curriculum/approvals/approve-and-send
👤 [API] User: { userId: '...', schoolId: '...', role: 'SCHOOL_ADMIN' }
📋 [API] Request body: { classId: '...', subjectId: '...', termId: '...' }
🔍 [API] Verifying class and subject...
✅ [API] Class: P.7, Subject: Mathematics
🚀 [API] Starting pipeline...

🚀 [PIPELINE] Starting Report Card Pipeline
📋 [PIPELINE] Input: { classId: '...', subjectId: '...', termId: '...', schoolId: '...', approvedBy: '...' }

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
  ✅ [STEP 5.1] PDF deployed: https://localhost:3000/api/reports/pdf/school123-term456-student789-1707484800000
  🔗 [STEP 6.1] Creating short URL...
  ✅ [STEP 6.1] Short URL created: https://tama.ri/ABC1
  💾 [STEP 7.1] Storing in database...
  ✅ [STEP 7.1] Stored with ID: 507f1f77bcf86cd799439011
  ✅ [COMPLETE] John Doe - Report card ready!

  📝 [STEP 4.2] Processing Jane Smith...
  ✅ [STEP 4.2] HTML generated
  ✅ [STEP 4.2] PDF generated (12456 bytes)
  🌐 [STEP 5.2] Deploying PDF...
  ✅ [STEP 5.2] PDF deployed: https://localhost:3000/api/reports/pdf/school123-term456-student790-1707484801000
  🔗 [STEP 6.2] Creating short URL...
  ✅ [STEP 6.2] Short URL created: https://tama.ri/ABC2
  💾 [STEP 7.2] Storing in database...
  ✅ [STEP 7.2] Stored with ID: 507f1f77bcf86cd799439012
  ✅ [COMPLETE] Jane Smith - Report card ready!

  ... (28 more students)

🎉 [PIPELINE] Pipeline completed successfully!
📊 [PIPELINE] Summary: {
  studentsProcessed: 30,
  reportCardsGenerated: 30,
  urlsCreated: 30,
  errors: 0
}

✅ [API] Pipeline completed
📊 [API] Result: {
  success: true,
  studentsProcessed: 30,
  reportCardsGenerated: 30,
  urlsCreated: 30,
  errors: 0
}
```

## Data Flow

```
User Input
    ↓
API Validation
    ↓
Pipeline Service
    ↓
┌─────────────────────────────────────┐
│ For Each Student:                   │
│                                     │
│ CA Entries → Calculate CA/20        │
│ Exam Entry → Calculate Exam/80      │
│ Final = CA + Exam                   │
│     ↓                               │
│ Generate HTML                       │
│     ↓                               │
│ Generate PDF                        │
│     ↓                               │
│ Store PDF (base64)                  │
│     ↓                               │
│ Create Full URL                     │
│     ↓                               │
│ Create Short URL                    │
│     ↓                               │
│ Store in PublishedReport            │
└─────────────────────────────────────┘
    ↓
Return Results
    ↓
Display to User
    ↓
URLs Are Live!
```

## Database Schema Flow

```
┌─────────────────────────────────────────────────────────────┐
│ PDFStorage                                                  │
├─────────────────────────────────────────────────────────────┤
│ id: "school123-term456-student789-1707484800000"            │
│ studentId: "507f1f77bcf86cd799439014"                       │
│ termId: "507f1f77bcf86cd799439013"                          │
│ schoolId: "507f1f77bcf86cd799439010"                        │
│ pdfData: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0..."    │
│ fileSize: 12345                                             │
│ createdAt: 2026-02-09T14:30:00.000Z                         │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Referenced by
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PDFAccess (Analytics)                                       │
├─────────────────────────────────────────────────────────────┤
│ id: "507f1f77bcf86cd799439020"                              │
│ pdfStorageId: "school123-term456-student789-1707484800000"  │
│ accessedAt: 2026-02-09T15:00:00.000Z                        │
│ ipAddress: "192.168.1.100"                                  │
│ userAgent: "Mozilla/5.0..."                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PublishedReport                                             │
├─────────────────────────────────────────────────────────────┤
│ id: "507f1f77bcf86cd799439011"                              │
│ studentId: "507f1f77bcf86cd799439014"                       │
│ termId: "507f1f77bcf86cd799439013"                          │
│ schoolId: "507f1f77bcf86cd799439010"                        │
│ publishedBy: "507f1f77bcf86cd799439001"                     │
│ publishedAt: 2026-02-09T14:30:00.000Z                       │
│ htmlContent: "<html>...</html>"                             │
│ pdfUrl: "https://localhost:3000/api/reports/pdf/..."        │
│ shortUrl: "https://tama.ri/ABC1"                            │
│ isAccessible: true                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ShortUrl                                                    │
├─────────────────────────────────────────────────────────────┤
│ id: "507f1f77bcf86cd799439030"                              │
│ code: "ABC1"                                                │
│ originalUrl: "https://localhost:3000/api/reports/pdf/..."   │
│ schoolId: "507f1f77bcf86cd799439010"                        │
│ studentId: "507f1f77bcf86cd799439014"                       │
│ channel: "SMS"                                              │
│ clickCount: 5                                               │
│ lastClickAt: 2026-02-09T16:00:00.000Z                       │
│ createdAt: 2026-02-09T14:30:00.000Z                         │
└─────────────────────────────────────────────────────────────┘
```

## Success! 🎉

The system is now complete and ready to:

1. ✅ Calculate final marks (CA + Exam)
2. ✅ Generate report card PDFs
3. ✅ Deploy to live URLs
4. ✅ Create short URLs
5. ✅ Store in database
6. ✅ Track access
7. ✅ Log every step

**Next**: Run `setup-report-card-pipeline.bat` to set up the database!
