# Report Card System - Complete Implementation Plan

## Architecture Overview

Split into 3 separate pages for better maintainability:

1. **`/dos/reports/generate`** - Report Generation & Validation
2. **`/dos/reports/review`** - Review, Approve & Publish
3. **`/dos/reports/templates`** - Template Management

---

## Phase 1: Database Schema (Foundation)

### Step 1.1: Add Prisma Models

**File**: `prisma/schema.prisma`

Add these models:

```prisma
model ReportCard {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId    String   @db.ObjectId
  studentId   String   @db.ObjectId
  classId     String   @db.ObjectId
  termId      String   @db.ObjectId

  // PDF Storage
  pdfUrl      String?
  pdfSize     Int?

  // Status tracking
  status      ReportCardStatus @default(DRAFT)
  generatedAt DateTime?
  approvedAt  DateTime?
  approvedBy  String?  @db.ObjectId
  publishedAt DateTime?
  publishedBy String?  @db.ObjectId

  // Download tracking
  downloadCount Int @default(0)
  lastDownloadAt DateTime?

  // Secure link
  secureToken String?  @unique
  linkExpiresAt DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school      School   @relation(fields: [schoolId], references: [id])
  student     Student  @relation(fields: [studentId], references: [id])
  class       Class    @relation(fields: [classId], references: [id])
  term        Term     @relation(fields: [termId], references: [id])

  @@unique([studentId, termId])
  @@index([schoolId, termId, status])
}
```

enum ReportCardStatus {
DRAFT
GENERATED
APPROVED
PUBLISHED
REVOKED
}

model ReportTemplate {
id String @id @default(auto()) @map("\_id") @db.ObjectId
schoolId String @db.ObjectId
name String
type TemplateType
content String
variables Json
isDefault Boolean @default(false)
isActive Boolean @default(true)
usageCount Int @default(0)
lastUsedAt DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
createdBy String @db.ObjectId

school School @relation(fields: [schoolId], references: [id])
creator Staff @relation(fields: [createdBy], references: [id])

@@unique([schoolId, name])
}

enum TemplateType {
NEW_CURRICULUM
LEGACY
CUSTOM
}

model ReportGenerationLog {
id String @id @default(auto()) @map("\_id") @db.ObjectId
schoolId String @db.ObjectId
classId String @db.ObjectId
termId String @db.ObjectId
action ReportAction
status String
totalStudents Int
successCount Int
failureCount Int
generationTime Float
errors Json?
performedBy String @db.ObjectId
performedAt DateTime @default(now())

school School @relation(fields: [schoolId], references: [id])
class Class @relation(fields: [classId], references: [id])
term Term @relation(fields: [termId], references: [id])
staff Staff @relation(fields: [performedBy], references: [id])
}

enum ReportAction {
GENERATED
APPROVED
PUBLISHED
REGENERATED
REVOKED
}

````

### Step 1.2: Run Migration

```bash
npx prisma db push
npx prisma generate
````

---

## Phase 2: Core Services

### Step 2.1: Report Validation Service

**File**: `src/services/report-validation.service.ts`

```typescript
export class ReportValidationService {
  // Check if class is ready for report generation
  async validateClassForReports(classId: string, termId: string);

  // Get validation status for all classes
  async getValidationStatus(schoolId: string, termId: string);

  // Check individual requirements
  async checkCAComplete(classId: string, termId: string);
  async checkExamsComplete(classId: string, termId: string);
  async checkScoresApproved(classId: string, termId: string);
}
```

### Step 2.2: Report Generation Service (Enhanced)

**File**: `src/services/report-generation.service.ts` (already exists - enhance it)

```typescript
export class ReportGenerationService {
  // Generate reports for entire class
  async generateClassReports(
    classId: string,
    termId: string,
    templateId: string,
  );

  // Generate single student report
  async generateStudentReport(
    studentId: string,
    termId: string,
    templateId: string,
  );

  // Regenerate reports (after corrections)
  async regenerateClassReports(classId: string, termId: string);
}
```

### Step 2.3: PDF Generation Service (Enhanced)

**File**: `src/services/pdf-generation.service.ts` (already exists - enhance it)

```typescript
export class PDFGenerationService {
  // Generate PDF from template + data
  async generatePDF(template: string, data: any): Promise<Buffer>;

  // Upload PDF to storage
  async uploadPDF(buffer: Buffer, filename: string): Promise<string>;

  // Get PDF size
  getPDFSize(buffer: Buffer): number;
}
```

### Step 2.4: Report Approval Service

**File**: `src/services/report-approval.service.ts` (new)

```typescript
export class ReportApprovalService {
  // Approve class reports
  async approveClassReports(
    classId: string,
    termId: string,
    approvedBy: string,
  );

  // Revoke approval
  async revokeApproval(classId: string, termId: string, revokedBy: string);
}
```

### Step 2.5: Report Publishing Service

**File**: `src/services/report-publishing.service.ts` (new)

```typescript
export class ReportPublishingService {
  // Publish reports (generate secure links)
  async publishClassReports(
    classId: string,
    termId: string,
    publishedBy: string,
  );

  // Generate secure download links
  async generateSecureLinks(reportIds: string[], expiryDays: number);

  // Send links to guardians (SMS/Email)
  async notifyGuardians(classId: string, termId: string);

  // Revoke published reports
  async revokePublishedReports(classId: string, termId: string);
}
```

---

## Phase 3: API Endpoints

### Page 1: Generate (`/dos/reports/generate`)

**Step 3.1**: `src/app/api/dos/reports/generate/validation/route.ts`

- GET: Get validation status for all classes
- Returns: Which classes are ready, blockers, validation checks

**Step 3.2**: `src/app/api/dos/reports/generate/bulk/route.ts`

- POST: Generate reports for multiple classes
- Body: `{ classIds: string[], termId: string, templateId: string }`

**Step 3.3**: `src/app/api/dos/reports/generate/class/[classId]/route.ts`

- POST: Generate reports for single class
- GET: Get generation status for class

### Page 2: Review (`/dos/reports/review`)

**Step 3.4**: `src/app/api/dos/reports/review/route.ts`

- GET: Get all generated reports (pending approval)
- Returns: Reports by class, status, preview URLs

**Step 3.5**: `src/app/api/dos/reports/review/[classId]/approve/route.ts`

- POST: Approve class reports
- Body: `{ termId: string }`

**Step 3.6**: `src/app/api/dos/reports/review/[classId]/publish/route.ts`

- POST: Publish approved reports
- Body: `{ termId: string, linkExpiryDays: number }`

**Step 3.7**: `src/app/api/dos/reports/review/[reportId]/preview/route.ts`

- GET: Preview individual report PDF

**Step 3.8**: `src/app/api/dos/reports/review/[reportId]/download/route.ts`

- GET: Download individual report

### Page 3: Templates (`/dos/reports/templates`)

**Step 3.9**: `src/app/api/dos/reports/templates/route.ts`

- GET: List all templates
- POST: Create new template

**Step 3.10**: `src/app/api/dos/reports/templates/[id]/route.ts`

- GET: Get template details
- PUT: Update template
- DELETE: Delete template

**Step 3.11**: `src/app/api/dos/reports/templates/[id]/preview/route.ts`

- POST: Preview template with sample data

**Step 3.12**: `src/app/api/dos/reports/templates/[id]/set-default/route.ts`

- POST: Set as default template

---

## Phase 4: Frontend Pages

### Page 1: Generate (`/dos/reports/generate`)

**File**: `src/app/(portals)/dos/reports/generate/page.tsx`

**Features**:

- Overview stats (classes ready, total students)
- Class validation table
  - Class name, student count, term
  - Validation status (5 checks with icons)
  - Blockers list
  - "Generate" button (enabled only if ready) and for students with no marks provided will be given a zero so that the generation is enabled and ready
- Bulk generation
  - Select multiple classes
  - "Generate Selected" button
- Generation progress
  - Real-time progress bar
  - Success/failure count
  - Error messages
- Critical issues alert
  - Classes with blockers
  - Action links to fix issues

### Page 2: Review (`/dos/reports/review`)

**File**: `src/app/(portals)/dos/reports/review/page.tsx`

**Features**:

- Filter by status (Generated, Approved, Published)
- Class report cards table
  - Class name, student count, term
  - Status badges
  - Generated date, approved date, published date
  - Download count
  - Link expiry date
- Actions per class
  - Preview (sample reports)
  - Approve (DoS approval)
  - Publish (release to guardians)
  - Download all (ZIP)
  - Regenerate (if corrections needed)
- Individual report preview modal
  - PDF viewer
  - Student details
  - Download button
- Bulk actions
  - Approve selected
  - Publish selected
  - Publish all
  
### Page 3: Templates (`/dos/reports/templates`)

**File**: `src/app/(portals)/dos/reports/templates/page.tsx`

**Features**:

- Template cards grid
  - Template name, type
  - Default badge, active badge
  - Usage count, last used date
  - Preview, Edit, Delete buttons
- Create new template
  - Template name
  - Type selection (New Curriculum, Legacy, Custom)
  - HTML/JSON editor
  - Variable list
  - Preview with sample data
- Edit template
  - Same as create
  - Version history (optional)
- Set default template
  - One default per type

---

## Phase 5: Implementation Steps (Execution Order)

### Week 1: Foundation

1. ✅ Add Prisma models
2. ✅ Run migration
3. ✅ Create validation service
4. ✅ Create approval service
5. ✅ Create publishing service

### Week 2: Generation System

6. ✅ Enhance report-generation.service.ts
7. ✅ Enhance pdf-generation.service.ts
8. ✅ Create validation API endpoints
9. ✅ Create bulk generation API
10. ✅ Build Generate page frontend

### Week 3: Review System

11. ✅ Create review API endpoints
12. ✅ Create approve API
13. ✅ Create publish API
14. ✅ Create preview/download APIs
15. ✅ Build Review page frontend

### Week 4: Templates System

16. ✅ Create template APIs (CRUD)
17. ✅ Create template preview API
18. ✅ Build Templates page frontend
19. ✅ Create default templates (New Curriculum, Legacy)

### Week 5: Integration & Testing

20. ✅ Test full workflow (Generate → Review → Publish)
21. ✅ Test bulk operations
22. ✅ Test secure links and downloads
23. ✅ Test guardian notifications
24. ✅ Performance testing (large classes)

---

## Phase 6: Additional Features

### Guardian Portal Integration

- Secure download page for guardians
- Download tracking
- Link expiry handling

### Notifications

- SMS to guardians when reports published
- Email with secure link
- DoS notifications (generation complete, errors)

### Analytics

- Report generation statistics
- Download rates per class
- Most used templates
- Generation time trends

### Audit Trail

- Who generated what and when
- Who approved what and when
- Who published what and when
- All actions logged in ReportGenerationLog

---

## Technical Decisions Needed

### 1. PDF Generation Library

**Options**:

- Puppeteer (HTML to PDF) - Recommended
- @react-pdf/renderer (React components to PDF)
- PDFKit (Low-level PDF creation)

**Recommendation**: Puppeteer (most flexible, supports complex layouts)

### 2. File Storage

**Options**:

- AWS S3
- Cloudinary
- Azure Blob Storage
- Local filesystem (dev only)

**Recommendation**: Cloudinary (already used in project, easy integration)

### 3. Template Engine

**Options**:

- Handlebars
- EJS
- React components
- Plain HTML with variable replacement

**Recommendation**: Handlebars (simple, powerful, widely used)

### 4. Secure Link Strategy

**Options**:

- JWT tokens
- Random tokens in database
- Signed URLs (S3/Cloudinary)

**Recommendation**: Random tokens + database (full control, revocable)

---

## Dependencies to Install

```bash
npm install puppeteer
npm install handlebars
npm install archiver  # For ZIP downloads
npm install qrcode    # For QR codes on reports (optional)
```

---

## File Structure

```
src/
├── app/
│   ├── (portals)/
│   │   └── dos/
│   │       └── reports/
│   │           ├── generate/
│   │           │   └── page.tsx
│   │           ├── review/
│   │           │   └── page.tsx
│   │           └── templates/
│   │               └── page.tsx
│   └── api/
│       └── dos/
│           └── reports/
│               ├── generate/
│               │   ├── validation/route.ts
│               │   ├── bulk/route.ts
│               │   └── class/[classId]/route.ts
│               ├── review/
│               │   ├── route.ts
│               │   ├── [classId]/
│               │   │   ├── approve/route.ts
│               │   │   └── publish/route.ts
│               │   └── [reportId]/
│               │       ├── preview/route.ts
│               │       └── download/route.ts
│               └── templates/
│                   ├── route.ts
│                   ├── [id]/route.ts
│                   ├── [id]/preview/route.ts
│                   └── [id]/set-default/route.ts
├── services/
│   ├── report-validation.service.ts (new)
│   ├── report-generation.service.ts (enhance)
│   ├── pdf-generation.service.ts (enhance)
│   ├── report-approval.service.ts (new)
│   └── report-publishing.service.ts (new)
└── templates/
    └── report-cards/
        ├── new-curriculum.hbs
        └── legacy.hbs
```

---

## Success Criteria

✅ DoS can see which classes are ready for reports
✅ DoS can generate reports for one or multiple classes
✅ DoS can preview generated reports
✅ DoS can approve reports
✅ DoS can publish reports with secure links
✅ Guardians receive SMS/Email with download link
✅ Guardians can download reports securely
✅ Links expire after set period
✅ DoS can track download statistics
✅ DoS can manage templates
✅ Full audit trail of all actions
✅ System handles errors gracefully
✅ Performance: Generate 500 reports in < 5 minutes

---

## Estimated Timeline

- **Phase 1 (Database)**: 1 day
- **Phase 2 (Services)**: 3 days
- **Phase 3 (APIs)**: 4 days
- **Phase 4 (Frontend)**: 5 days
- **Phase 5 (Testing)**: 2 days
- **Total**: ~15 working days (3 weeks)

---

## Next Steps

1. Review this plan
2. Confirm technical decisions (PDF library, storage, template engine)
3. Start with Phase 1 (Database schema)
4. Proceed sequentially through phases

Ready to start implementation?
