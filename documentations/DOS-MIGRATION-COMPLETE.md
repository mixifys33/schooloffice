# DoS Migration: Dashboard → Portal

## Complete Migration Guide

**Date**: 2026-02-12  
**Status**: 📦 READY TO EXECUTE

## What This Migration Does

This migration consolidates ALL Director of Studies (DoS) functionality into the portal section (`/dos/`) and removes it completely from the dashboard section (`/dashboard/dos/`).

### Before Migration

- DoS pages scattered between `/dashboard/dos/` and `/dos/`
- Confusing navigation (sometimes dashboard, sometimes portal)
- Duplicate or inconsistent functionality

### After Migration

- ALL DoS pages at `/dos/` (portal section)
- ZERO DoS pages at `/dashboard/dos/`
- Consistent navigation and user experience
- Single source of truth for DoS functionality

## How to Execute

### Step 1: Run Migration Script

```powershell
.\migrate-dos-to-portal.ps1
```

This script will:
   
1. ✅ Copy missing pages from dashboard to portal
2. ✅ Update all route references (`/dashboard/dos/` → `/dos/`)
3. ✅ Update navigation components
4. ✅ Delete dashboard DoS directory (with confirmation)

### Step 2: Verify Migration

```powershell
.\verify-dos-migration.ps1
```

This checks:

- All required directories exist in portal
- No dashboard DoS remnants
- No old route references

### Step 3: Test Application

```bash
npm run dev
```

Test these URLs:

- ✅ http://localhost:3000/dos (main DoS portal)
- ✅ http://localhost:3000/dos/grading
- ✅ http://localhost:3000/dos/timetable
- ✅ http://localhost:3000/dos/assignments
- ✅ http://localhost:3000/dos/assessments
- ✅ http://localhost:3000/dos/curriculum
- ✅ http://localhost:3000/dos/exams
- ✅ http://localhost:3000/dos/reports
- ✅ http://localhost:3000/dos/scores
- ✅ http://localhost:3000/dos/subjects
- ✅ http://localhost:3000/dos/analytics
- ✅ http://localhost:3000/dos/settings

### Step 4: Build Check

```bash
npm run build
```

Ensure no TypeScript or build errors.

## What Gets Migrated

### Pages Copied

1. **Grading** (`/grading/`) - Complete grading system management
2. **Timetable** (`/timetable/`) - Timetable management and inspection
3. **Assignments** (`/assignments/`) - Assignment management
4. **Assessments Plans** (`/assessments/plans/`) - Assessment planning
5. **Assessments Performance** (`/assessments/performance/`) - Performance tracking
6. **Curriculum Approvals** (`/curriculum/approvals/`) - Curriculum approvals
7. **Curriculum Subjects** (`/curriculum/subjects/`) - Subject configuration
8. **Curriculum Timetable** (`/curriculum/timetable/`) - Curriculum timetable

### Routes Updated

All occurrences of `/dashboard/dos/` replaced with `/dos/` in:

- All `.tsx` files in portal DoS
- All `.ts` files in portal DoS
- Navigation components
- Link components
- Router calls
- Fetch calls

### Files Updated

- `src/components/dos/dos-navigation.tsx` - Navigation links
- All portal DoS page files - Internal links
- Portal DoS layout - Route references

## Rollback Plan

If issues occur:

### Option 1: Git Revert

```bash
git status
git checkout -- .
```

### Option 2: Manual Restore

1. Don't delete dashboard DoS (skip that step in script)
2. Fix issues in portal
3. Re-run migration

## Post-Migration Checklist

- [ ] All DoS pages load at `/dos/*`
- [ ] Navigation works correctly
- [ ] No 404 errors
- [ ] No broken links
- [ ] Authentication works
- [ ] All features functional
- [ ] Build succeeds
- [ ] No console errors

## Common Issues & Solutions

### Issue: 404 on DoS pages

**Solution**: Clear Next.js cache

```bash
rm -rf .next
npm run dev
```

### Issue: Old routes still appearing

**Solution**: Search and replace manually

```bash
# Search for old routes
grep -r "/dashboard/dos/" src/app/(portals)/dos/
```

### Issue: Navigation not working

**Solution**: Check `dos-navigation.tsx`

- Ensure all `href` attributes use `/dos/` not `/dashboard/dos/`

### Issue: Build errors

**Solution**: Check import paths

- Imports should still work (they reference components, not routes)
- Only route strings need updating

## API Endpoints (Unchanged)

API endpoints remain at `/api/dos/*` - NO changes needed:

- `/api/dos/context`
- `/api/dos/grading-systems`
- `/api/dos/classes`
- `/api/dos/terms`
- `/api/dos/scores`
- etc.

## Components (Unchanged)

Components in `/src/components/dos/` remain unchanged:

- `dos-navigation.tsx` (routes updated)
- Other DoS components work as-is

## Benefits After Migration

1. **Clarity**: All DoS functionality in one place
2. **Consistency**: Single navigation pattern
3. **Maintainability**: Easier to find and update DoS code
4. **User Experience**: No confusion about which section to use
5. **Clean Architecture**: Portal for role-based access, dashboard for admin

## Support

If you encounter issues:

1. Check the verification script output
2. Review the common issues section
3. Check browser console for errors
4. Check Next.js terminal for errors
5. Use git to see what changed: `git diff`

## Success Criteria

✅ Migration is successful when:

1. All DoS pages accessible at `/dos/*`
2. No DoS pages at `/dashboard/dos/*`
3. All navigation works
4. No 404 errors
5. No broken links
6. Build succeeds
7. All features work

---

**Ready to migrate?** Run `.\migrate-dos-to-portal.ps1`
