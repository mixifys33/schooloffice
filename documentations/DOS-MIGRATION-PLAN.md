# DoS Section Migration Plan
## Dashboard → Portal Consolidation

**Date**: 2026-02-12  
**Status**: 🚧 IN PROGRESS

## Objective
Move ALL DoS-related pages, components, and logic from `/dashboard/dos/` to `/dos/` (portals section) to eliminate confusion and consolidate DoS functionality in one place.

## Current State Analysis

### Dashboard DoS (`/src/app/(back)/dashboard/dos/`)
- ✅ Main dashboard page
- ✅ Analytics (performance, teachers, trends)
- ✅ Assessments (monitoring, performance, plans)
- ✅ Assignments
- ✅ Curriculum (approvals, subjects, timetable)
- ✅ Exams (management, marking, validation)
- ✅ **Grading** (ONLY in dashboard - needs migration)
- ✅ Reports (generate, review, templates)
- ✅ Scores
- ✅ Settings
- ✅ Subjects (full management)
- ✅ Timetable (inspect)

### Portal DoS (`/src/app/(portals)/dos/`)
- ✅ Main portal page
- ✅ Analytics (performance, teachers, trends)
- ✅ Assessments (monitoring, [id])
- ✅ Curriculum
- ✅ Exams (management, marking, validation)
- ❌ **Grading** (MISSING - needs to be added)
- ✅ Reports (generate, review, templates)
- ✅ Scores (classes/[classId])
- ✅ Settings
- ✅ Subjects (full management)
- ❌ **Timetable** (MISSING - needs to be added)
- ❌ **Assignments** (MISSING - needs to be added)

## Migration Strategy

### Phase 1: Copy Missing Pages ✅
1. Copy `/dashboard/dos/grading/` → `/dos/grading/`
2. Copy `/dashboard/dos/timetable/` → `/dos/timetable/`
3. Copy `/dashboard/dos/assignments/` → `/dos/assignments/`
4. Copy any missing subdirectories

### Phase 2: Update Routes in Files 🔄
Update all internal links from `/dashboard/dos/*` to `/dos/*` in:
- All DoS page components
- DoS navigation component
- DoS layout
- Any Link components
- Any router.push() calls
- Any fetch() API calls (if they reference routes)

### Phase 3: Update Navigation 🔄
- Update `src/components/dos/dos-navigation.tsx`
- Remove dashboard DoS from main navigation
- Ensure all links point to `/dos/*` not `/dashboard/dos/*`

### Phase 4: Delete Dashboard DoS 🗑️
- Delete entire `/src/app/(back)/dashboard/dos/` directory
- Remove DoS from dashboard navigation
- Remove DoS layout from dashboard

### Phase 5: Verification ✅
- Test all DoS pages load correctly
- Test all navigation works
- Test all internal links work
- Verify no broken links remain

## Files to Update

### Navigation Components
- `src/components/dos/dos-navigation.tsx`
- `src/app/(back)/dashboard/layout.tsx` (remove DoS)
- `src/app/(portals)/dos/layout.tsx` (verify correct)

### All DoS Pages (update internal links)
- All files in `/src/app/(portals)/dos/**/*.tsx`
- Search for `/dashboard/dos/` and replace with `/dos/`

## Risks & Considerations
- ⚠️ Some pages may have hardcoded `/dashboard/dos/` routes
- ⚠️ API endpoints should remain unchanged (they're in `/api/dos/`)
- ⚠️ Components in `/src/components/dos/` should work as-is
- ⚠️ Need to test authentication/authorization still works

## Rollback Plan
If issues occur:
1. Git revert the changes
2. Restore dashboard DoS from backup
3. Fix issues incrementally

## Success Criteria
- ✅ All DoS pages accessible at `/dos/*`
- ✅ No DoS pages at `/dashboard/dos/*`
- ✅ All navigation works correctly
- ✅ No 404 errors
- ✅ No broken links
- ✅ Authentication works
- ✅ All features functional

## Execution Log
- [ ] Phase 1: Copy missing pages
- [ ] Phase 2: Update routes
- [ ] Phase 3: Update navigation
- [ ] Phase 4: Delete dashboard DoS
- [ ] Phase 5: Verification
