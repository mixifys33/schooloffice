# Portal to Dashboard Migration Plan

**Date**: 2026-02-10  
**Issue**: Pages exist in `src/app/(portals)/` but should be in `src/app/(back)/dashboard/`  
**Goal**: Move all working pages to dashboard structure and link them in navigation

---

## Current Structure Issues

### ❌ Problem

- **Two parallel structures**: `(portals)` and `(back)/dashboard`
- Pages in `(portals)` are NOT accessible via `/dashboard/` URLs
- Navigation sidebars point to `/dashboard/` but pages are in `(portals)`
- Result: 404 errors or missing pages

### ✅ Solution

1. Move all pages from `(portals)` to `(back)/dashboard`
2. Update all navigation links
3. Update all API calls if needed
4. Delete empty `(portals)` directory

---

## Migration Mapping

### 1. Class Teacher Pages

**Source**: `src/app/(portals)/class-teacher/`  
**Destination**: `src/app/(back)/dashboard/class-teacher/`

| Current Path (portals)               | Target Path (dashboard)                        | Status    |
| ------------------------------------ | ---------------------------------------------- | --------- |
| `/class-teacher/assessments/`        | `/dashboard/class-teacher/assessments/`        | ✅ EXISTS |
| `/class-teacher/assessments/ca/`     | `/dashboard/class-teacher/assessments/ca/`     | ✅ EXISTS |
| `/class-teacher/assessments/exam/`   | `/dashboard/class-teacher/assessments/exam/`   | ✅ EXISTS |
| `/class-teacher/assessments/report/` | `/dashboard/class-teacher/assessments/report/` | ⚠️ MOVE   |
| `/class-teacher/attendance/`         | `/dashboard/class-teacher/attendance/`         | ⚠️ MOVE   |
| `/class-teacher/class-details/`      | `/dashboard/class-teacher/class-details/`      | ⚠️ MOVE   |
| `/class-teacher/evidence/`           | `/dashboard/class-teacher/evidence/`           | ⚠️ MOVE   |
| `/class-teacher/marks/`              | `/dashboard/class-teacher/marks/`              | ⚠️ MOVE   |
| `/class-teacher/messages/`           | `/dashboard/class-teacher/messages/`           | ⚠️ MOVE   |
| `/class-teacher/performance/`        | `/dashboard/class-teacher/performance/`        | ⚠️ MOVE   |
| `/class-teacher/profile/`            | `/dashboard/class-teacher/profile/`            | ⚠️ MOVE   |
| `/class-teacher/reports/`            | `/dashboard/class-teacher/reports/`            | ⚠️ MOVE   |
| `/class-teacher/students/`           | `/dashboard/class-teacher/students/`           | ⚠️ MOVE   |
| `/class-teacher/timetable/`          | `/dashboard/class-teacher/timetable/`          | ⚠️ MOVE   |

### 2. DoS (Director of Studies) Pages

**Source**: `src/app/(portals)/dos/`  
**Destination**: `src/app/(back)/dashboard/dos/`

| Current Path (portals)          | Target Path (dashboard)                   | Status    |
| ------------------------------- | ----------------------------------------- | --------- |
| `/dos/analytics/`               | `/dashboard/dos/analytics/`               | ⚠️ MOVE   |
| `/dos/assessments/`             | `/dashboard/dos/assessments/`             | ✅ EXISTS |
| `/dos/assessments/monitoring/`  | `/dashboard/dos/assessments/monitoring/`  | ✅ EXISTS |
| `/dos/assessments/performance/` | `/dashboard/dos/assessments/performance/` | ✅ EXISTS |
| `/dos/curriculum/`              | `/dashboard/dos/curriculum/`              | ⚠️ MOVE   |
| `/dos/exams/`                   | `/dashboard/dos/exams/`                   | ⚠️ MOVE   |
| `/dos/exams/validation/`        | `/dashboard/dos/exams/validation/`        | ⚠️ MOVE   |
| `/dos/reports/`                 | `/dashboard/dos/reports/`                 | ⚠️ MOVE   |
| `/dos/reports/generate/`        | `/dashboard/dos/reports/generate/`        | ⚠️ MOVE   |
| `/dos/reports/review/`          | `/dashboard/dos/reports/review/`          | ⚠️ MOVE   |
| `/dos/reports/templates/`       | `/dashboard/dos/reports/templates/`       | ⚠️ MOVE   |
| `/dos/scores/`                  | `/dashboard/dos/scores/`                  | ⚠️ MOVE   |
| `/dos/settings/`                | `/dashboard/dos/settings/`                | ⚠️ MOVE   |
| `/dos/subjects/`                | `/dashboard/dos/subjects/`                | ⚠️ MOVE   |
| `/dos/subjects/[id]/`           | `/dashboard/dos/subjects/[id]/`           | ⚠️ MOVE   |
| `/dos/subjects/add/`            | `/dashboard/dos/subjects/add/`            | ⚠️ MOVE   |
| `/dos/subjects/analytics/`      | `/dashboard/dos/subjects/analytics/`      | ⚠️ MOVE   |
| `/dos/subjects/configuration/`  | `/dashboard/dos/subjects/configuration/`  | ⚠️ MOVE   |
| `/dos/subjects/core/`           | `/dashboard/dos/subjects/core/`           | ⚠️ MOVE   |
| `/dos/subjects/electives/`      | `/dashboard/dos/subjects/electives/`      | ⚠️ MOVE   |
| `/dos/subjects/interventions/`  | `/dashboard/dos/subjects/interventions/`  | ⚠️ MOVE   |
| `/dos/subjects/management/`     | `/dashboard/dos/subjects/management/`     | ⚠️ MOVE   |
| `/dos/subjects/performance/`    | `/dashboard/dos/subjects/performance/`    | ⚠️ MOVE   |

### 3. Teacher Pages

**Source**: `src/app/(portals)/teacher/`  
**Destination**: `src/app/(back)/dashboard/teacher/`

| Current Path (portals)           | Target Path (dashboard)                    | Status    |
| -------------------------------- | ------------------------------------------ | --------- |
| `/teacher/assessments/`          | `/dashboard/teacher/assessments/`          | ⚠️ MOVE   |
| `/teacher/assessments/ca/`       | `/dashboard/teacher/assessments/ca/`       | ⚠️ MOVE   |
| `/teacher/assessments/exam/`     | `/dashboard/teacher/assessments/exam/`     | ⚠️ MOVE   |
| `/teacher/assessments/report/`   | `/dashboard/teacher/assessments/report/`   | ⚠️ MOVE   |
| `/teacher/assignments/`          | `/dashboard/teacher/assignments/`          | ⚠️ MOVE   |
| `/teacher/attendance/`           | `/dashboard/teacher/attendance/`           | ⚠️ MOVE   |
| `/teacher/attendance/[classId]/` | `/dashboard/teacher/attendance/[classId]/` | ⚠️ MOVE   |
| `/teacher/attendance/history/`   | `/dashboard/teacher/attendance/history/`   | ⚠️ MOVE   |
| `/teacher/classes/`              | `/dashboard/teacher/classes/`              | ⚠️ MOVE   |
| `/teacher/classes/[classId]/`    | `/dashboard/teacher/classes/[classId]/`    | ⚠️ MOVE   |
| `/teacher/evidence/`             | `/dashboard/teacher/evidence/`             | ⚠️ MOVE   |
| `/teacher/marks/`                | `/dashboard/teacher/marks/`                | ✅ EXISTS |
| `/teacher/messages/`             | `/dashboard/teacher/messages/`             | ⚠️ MOVE   |
| `/teacher/profile/`              | `/dashboard/teacher/profile/`              | ⚠️ MOVE   |
| `/teacher/reports/`              | `/dashboard/teacher/reports/`              | ⚠️ MOVE   |
| `/teacher/settings/`             | `/dashboard/teacher/settings/`             | ⚠️ MOVE   |
| `/teacher/students/`             | `/dashboard/teacher/students/`             | ✅ EXISTS |
| `/teacher/timetable/`            | `/dashboard/teacher/timetable/`            | ⚠️ MOVE   |

### 4. Parent Pages

**Source**: `src/app/(portals)/parent/`  
**Destination**: `src/app/(back)/dashboard/parent/`

| Current Path (portals) | Target Path (dashboard)        | Status  |
| ---------------------- | ------------------------------ | ------- |
| `/parent/academics/`   | `/dashboard/parent/academics/` | ⚠️ MOVE |
| `/parent/fees/`        | `/dashboard/parent/fees/`      | ⚠️ MOVE |
| `/parent/messages/`    | `/dashboard/parent/messages/`  | ⚠️ MOVE |
| `/parent/settings/`    | `/dashboard/parent/settings/`  | ⚠️ MOVE |

### 5. Student Pages

**Source**: `src/app/(portals)/student/`  
**Destination**: `src/app/(back)/dashboard/student/`

| Current Path (portals) | Target Path (dashboard)         | Status  |
| ---------------------- | ------------------------------- | ------- |
| `/student/fees/`       | `/dashboard/student/fees/`      | ⚠️ MOVE |
| `/student/results/`    | `/dashboard/student/results/`   | ⚠️ MOVE |
| `/student/settings/`   | `/dashboard/student/settings/`  | ⚠️ MOVE |
| `/student/timetable/`  | `/dashboard/student/timetable/` | ⚠️ MOVE |

### 6. Super Admin Pages

**Source**: `src/app/(portals)/super-admin/`  
**Destination**: `src/app/(back)/dashboard/super-admin/`

| Current Path (portals)                | Target Path (dashboard)                         | Status  |
| ------------------------------------- | ----------------------------------------------- | ------- |
| `/super-admin/business-intelligence/` | `/dashboard/super-admin/business-intelligence/` | ⚠️ MOVE |
| `/super-admin/dashboard/`             | `/dashboard/super-admin/dashboard/`             | ⚠️ MOVE |
| `/super-admin/schools/`               | `/dashboard/super-admin/schools/`               | ⚠️ MOVE |
| `/super-admin/schools/[id]/`          | `/dashboard/super-admin/schools/[id]/`          | ⚠️ MOVE |
| `/super-admin/settings/`              | `/dashboard/super-admin/settings/`              | ⚠️ MOVE |

---

## Navigation Updates Needed

### 1. DoS Navigation

**File**: `src/components/dos/dos-navigation.tsx`

Current links already point to `/dashboard/dos/...` ✅

Missing pages to add:

- Analytics
- Curriculum (with Timetable and Approvals subpages)
- Exams (with Validation subpage)
- Scores
- Settings

### 2. Class Teacher Navigation

**File**: `src/components/class-teacher/class-teacher-navigation.tsx`

Current links already point to `/dashboard/class-teacher/...` ✅

Missing pages to add:

- My Class (class-details)
- Attendance
- Marks
- Messages

### 3. Teacher Navigation

**File**: `src/components/teacher/teacher-sidebar.tsx` (needs checking)

Missing pages to add:

- All teacher portal pages

### 4. Parent Navigation

**File**: Needs to be created

### 5. Student Navigation

**File**: Needs to be created

---

## Migration Steps

### Phase 1: Class Teacher (Priority 1)

1. ✅ Copy missing pages from `(portals)/class-teacher/` to `(back)/dashboard/class-teacher/`
2. ✅ Update navigation to include all pages
3. ✅ Test all pages load correctly
4. ✅ Update API calls if needed

### Phase 2: DoS (Priority 1)

1. ✅ Copy missing pages from `(portals)/dos/` to `(back)/dashboard/dos/`
2. ✅ Update navigation to include all pages
3. ✅ Test all pages load correctly

### Phase 3: Teacher (Priority 2)

1. ⚠️ Copy all pages from `(portals)/teacher/` to `(back)/dashboard/teacher/`
2. ⚠️ Create/update teacher navigation
3. ⚠️ Test all pages

### Phase 4: Parent & Student (Priority 3)

1. ⚠️ Copy all pages
2. ⚠️ Create navigation components
3. ⚠️ Test all pages

### Phase 5: Super Admin (Priority 3)

1. ⚠️ Copy all pages
2. ⚠️ Update navigation
3. ⚠️ Test all pages

### Phase 6: Cleanup

1. ⚠️ Delete `src/app/(portals)/` directory
2. ⚠️ Update any remaining references
3. ⚠️ Run full application test

---

## Execution Plan

**Immediate Action**: Start with Class Teacher and DoS (most critical for current users)

**Command to execute**:

```bash
# Phase 1: Class Teacher
# Copy missing pages and update navigation

# Phase 2: DoS
# Copy missing pages and update navigation

# Phase 3-6: Continue with remaining portals
```

---

**Status**: 📋 PLAN CREATED - Ready for execution
