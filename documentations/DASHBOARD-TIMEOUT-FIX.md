# Dashboard Timeout Fix

**Date**: 2026-02-10  
**Status**: ✅ **RESOLVED**

## Error

```
Dashboard API request was aborted due to timeout
Request timed out. Please check your connection and try again.
```

## Root Cause

The school admin dashboard API (`/api/dashboard/overview`) was taking longer than 15 seconds to respond, causing the frontend to abort the request. This happened because:

1. Multiple complex database queries were running
2. No timeout protection on individual queries
3. Slow database connection or large dataset

## Resolution

### 1. Increased Frontend Timeout

**File**: `src/app/(back)/dashboard/school-admin/page.tsx`

```typescript
// Before: 15 seconds
}, 15000)

// After: 30 seconds
}, 30000) // Increased timeout to 30 seconds for complex queries
```

### 2. Added Query-Level Timeouts

**File**: `src/app/api/dashboard/overview/route.ts`

Added 25-second timeout protection for each database query using `Promise.race()`:

```typescript
const queryTimeout = 25000 // 25 second timeout for database queries

const [totalStudents, paidStudents, school, currentTerm, todayAttendance] = 
  await Promise.allSettled([
    // Each query wrapped with timeout
    Promise.race([
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), queryTimeout)
      )
    ]),
    // ... other queries
  ])
```

### 3. Graceful Degradation

The API already uses `Promise.allSettled()` which means:
- ✅ If one query fails/times out, others continue
- ✅ Failed queries return default values (0, null, [])
- ✅ Dashboard still loads with partial data

## Benefits

1. **Prevents indefinite hangs** - Queries timeout after 25 seconds
2. **Better user experience** - Frontend waits up to 30 seconds
3. **Graceful degradation** - Dashboard loads even if some queries fail
4. **Clear error messages** - Users know what went wrong

## Timeout Hierarchy

```
Frontend Timeout: 30 seconds
  └─> API Query Timeout: 25 seconds
      └─> Individual queries race against timeout
```

This ensures queries fail before the frontend timeout, allowing proper error handling.

## User Experience

- ❌ Before: Dashboard hangs, then shows timeout er