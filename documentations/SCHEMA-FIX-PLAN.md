# Schema Fix Plan - Add schoolId to All Models

> **Status**: Ready to Execute  
> **Date**: 2026-02-10  
> **School**: Rwenzori Valley (Single school - SAFE)

---

## 🎯 Objective

Add `schoolId` field and proper School relations to **131 models** that are missing them.

---

## ✅ Pre-Migration Check

**Data Integrity**: ✅ PASSED

- Single school in database
- No cross-school contamination possible
- Safe to proceed

---

## 📋 Models to Fix

### Category 1: Models with schoolId but NO relation (65 models)

These have the field but need the relation added:

```prisma
// Before:
model Payment {
  schoolId String @db.ObjectId
  // Missing relation!
}

// After:
model Payment {
  schoolId String @db.ObjectId
  school   School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}
```

**Models**: User, SystemLock, PasswordReset, StaffTask, PublishedReportCard, FeeStructure, DiscountRule, PenaltyRule, Invoice, Payment, Receipt, FinanceAuditLog, FinanceNotificationLog, FinanceSettings, and 51 more...

### Category 2: Models with NO schoolId at all (66 models)

These need both the field AND the relation:

```prisma
// Before:
model Guardian {
  id String @id
  // No schoolId!
}

// After:
model Guardian {
  id       String @id
  schoolId String @db.ObjectId
  school   School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}
```

**Critical Models**: Guardian, Term, Stream, Mark, Result, Attendance, CAEntry, ExamEntry, DisciplineCase, and 57 more...

---

## 🔧 Migration Strategy

### Phase 1: Update Prisma Schema

1. Add `schoolId` field to models without it
2. Add School relation to all models
3. Add indexes for performance
4. Update School model with all new relations

### Phase 2: Database Migration

1. Run `npx prisma db push` to update database schema
2. Populate `schoolId` for all existing records (single school = easy!)
3. Make `schoolId` required (NOT NULL)

### Phase 3: Verification

1. Check all records have schoolId
2. Test queries with school filtering
3. Verify cascade deletes work

---

## ⚠️ Important Notes

### Cascade Delete Strategy

**onDelete: Cascade** - When school is deleted, all related data is deleted:

- ✅ Use for: Student, Staff, Class, Subject, Term, etc.
- ✅ Safe because: School deletion should remove all school data

**onDelete: Restrict** - Prevent deletion if related data exists:

- ❌ Not recommended: Makes school deletion impossible
- Only use for critical audit logs if needed

### Index Strategy

Add indexes for:

- `schoolId` on all models (for filtering)
- Composite indexes where needed (e.g., `[schoolId, status]`)

---

## 🚀 Execution Steps

### Step 1: Backup Database

```bash
# MongoDB backup (if using MongoDB Atlas)
# Or export your data before proceeding
```

### Step 2: Run Schema Update

```bash
node update-prisma-schema.js
```

### Step 3: Push to Database

```bash
npx prisma generate
npx prisma db push
```

### Step 4: Populate schoolId

```bash
node migrate-add-schoolid.js
```

### Step 5: Verify

```bash
node verify-migration.js
```

---

## 📊 Expected Changes

- **Schema file**: +400 lines (schoolId fields + relations)
- **Database**: +131 columns (one per model)
- **Data migration**: ~1000+ records updated (depends on your data)
- **Time**: 5-10 minutes total

---

## 🔄 Rollback Plan

If something goes wrong:

1. **Schema rollback**: Git revert the schema changes
2. **Database rollback**: MongoDB doesn't have migrations, but you can:
   - Drop the new `schoolId` fields manually
   - Restore from backup if needed

---

## ✅ Success Criteria

1. All models have `schoolId` field
2. All models have School relation
3. All existing records have `schoolId` populated
4. Queries work with school filtering
5. No errors in application

---

**Ready to proceed?** Run the scripts in order:

1. `node check-data-integrity.js` ✅ (Already done)
2. `node update-prisma-schema.js` (Next)
3. `npx prisma db push`
4. `node migrate-add-schoolid.js`
5. `node verify-migration.js`
