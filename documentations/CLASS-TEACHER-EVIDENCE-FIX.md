# Class Teacher Evidence API Fix

**Date**: 2026-02-09  
**Status**: ✅ RESOLVED

## Error

```
Failed to fetch evidence data
at fetchData (src/app/(back)/dashboard/class-teacher/evidence/page.tsx:92:17)
```

**HTTP Status**: 404 Not Found  
**Endpoint**: `GET /api/class-teacher/evidence`

## Root Cause

The Class Teacher Evidence page (`/dashboard/class-teacher/evidence`) was calling an API endpoint that didn't exist. The endpoint was never implemented.

## Resolution

Created `/src/app/api/class-teacher/evidence/route.ts` with full implementation:

### Features Implemented

1. **Authentication & Authorization**
   - Session validation
   - School context validation
   - Staff profile verification
   - Role verification (CLASS_TEACHER, SCHOOL_ADMIN, DEPUTY)

2. **Data Retrieval**
   - Fetches staff subject assignments (StaffSubject)
   - Returns only classes and subjects the teacher is assigned to
   - Builds classes array with class and subject information

3. **Response Structure**

   ```typescript
   {
     classes: [
       {
         id: string,           // Combined classId-subjectId
         classId: string,
         className: string,
         subjectId: string,
         subjectName: string,
       }
     ],
     evidenceFiles: [],        // Empty until Evidence model is implemented
     isLoading: false
   }
   ```

4. **Error Handling**
   - 401: Authentication required
   - 400: No school context
   - 404: No staff profile found
   - 403: Access denied (invalid role)
   - 500: Server error with details

## Current Limitations

The API currently returns an empty `evidenceFiles` array because:

1. **No Evidence Model**: The Prisma schema doesn't have an Evidence model yet
2. **No File Storage**: File upload/storage system not implemented
3. **No Upload Endpoint**: `/api/class-teacher/evidence/upload` doesn't exist
4. **No Delete Endpoint**: `/api/class-teacher/evidence/[id]` doesn't exist

## Next Steps (Future Implementation)

### 1. Add Evidence Model to Prisma Schema

```prisma
model Evidence {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  fileName            String
  fileType            String   // 'document' | 'image' | 'video' | 'other'
  fileSize            Int      // in bytes
  fileUrl             String   // URL to stored file
  uploadDate          DateTime @default(now())
  description         String?
  linkedCompetencies  String[] // Array of competency IDs or names
  linkedAssessments   String[] // Array of assessment IDs

  // Relations
  uploadedBy          String   @db.ObjectId
  staff               Staff    @relation(fields: [uploadedBy], references: [id])

  classId             String   @db.ObjectId
  class               Class    @relation(fields: [classId], references: [id])

  subjectId           String   @db.ObjectId
  subject             Subject  @relation(fields: [subjectId], references: [id])

  schoolId            String   @db.ObjectId
  school              School   @relation(fields: [schoolId], references: [id])

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([schoolId])
  @@index([classId])
  @@index([subjectId])
  @@index([uploadedBy])
}
```

### 2. Implement File Upload Endpoint

Create `/src/app/api/class-teacher/evidence/upload/route.ts`:

- Handle multipart/form-data
- Validate file types and sizes
- Store files (ImageKit, S3, or local storage)
- Create Evidence records in database
- Return uploaded file information

### 3. Implement File Delete Endpoint

Create `/src/app/api/class-teacher/evidence/[id]/route.ts`:

- Verify ownership (teacher can only delete their own uploads)
- Delete file from storage
- Delete Evidence record from database
- Return success confirmation

### 4. Update Evidence API to Query Database

Modify `/src/app/api/class-teacher/evidence/route.ts`:

```typescript
const evidenceFiles = await prisma.evidence.findMany({
  where: {
    schoolId,
    uploadedBy: staff.id,
    classId: {
      in: staffSubjects.map((ss) => ss.classId),
    },
  },
  include: {
    class: { select: { name: true } },
    subject: { select: { name: true } },
    staff: { select: { firstName: true, lastName: true } },
  },
  orderBy: { uploadDate: "desc" },
});
```

## Testing

The API endpoint is now accessible and returns:

- ✅ Classes array with teacher's assigned classes and subjects
- ✅ Empty evidenceFiles array (ready for future implementation)
- ✅ Proper authentication and authorization
- ✅ Proper error handling

## Files Modified

1. **Created**: `src/app/api/class-teacher/evidence/route.ts`
2. **Updated**: `AGENTS.md` (documented fix)
3. **Created**: `CLASS-TEACHER-EVIDENCE-FIX.md` (this file)

## Impact

- ✅ Evidence page now loads without 404 error
- ✅ Teacher can see their assigned classes and subjects
- ✅ UI displays "No Evidence Uploaded" message (expected behavior)
- ⏳ File upload functionality ready for implementation when Evidence model is added

---

**Status**: The 404 error is completely resolved. The page now loads successfully with empty evidence data, which is the correct behavior until the Evidence model and file upload system are implemented.
