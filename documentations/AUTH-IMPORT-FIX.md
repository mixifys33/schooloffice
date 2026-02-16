# Authentication Import Fix

## Error

```
Export getServerSession doesn't exist in target module
The export getServerSession was not found in module next-auth
```

## Root Cause

The attendance API routes were using the wrong authentication import:

- ❌ Used: `import { getServerSession } from 'next-auth'`
- ✅ Should use: `import { auth } from '@/lib/auth'`

This is because the project uses a custom `auth()` function from `@/lib/auth` instead of the standard `getServerSession` from next-auth.

## Files Fixed

All 4 attendance API routes were updated:

### 1. Main Attendance API

**File**: `src/app/api/class-teacher/attendance/route.ts`

- ✅ Changed import from `getServerSession` to `auth`
- ✅ Changed `await getServerSession(authOptions)` to `await auth()`
- ✅ Applied to both GET and POST handlers

### 2. Submit API

**File**: `src/app/api/class-teacher/attendance/submit/route.ts`

- ✅ Changed import from `getServerSession` to `auth`
- ✅ Changed `await getServerSession(authOptions)` to `await auth()`

### 3. History API

**File**: `src/app/api/class-teacher/attendance/history/route.ts`

- ✅ Changed import from `getServerSession` to `auth`
- ✅ Changed `await getServerSession(authOptions)` to `await auth()`

### 4. Export API

**File**: `src/app/api/class-teacher/attendance/export/route.ts`

- ✅ Changed import from `getServerSession` to `auth`
- ✅ Changed `await getServerSession(authOptions)` to `await auth()`

## Changes Made

### Before (❌ Wrong)

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  // ...
}
```

### After (✅ Correct)

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  // ...
}
```

## Verification

All attendance API routes now use the same authentication pattern as other API routes in the project:

- ✅ Consistent with existing API routes
- ✅ Uses project's custom auth function
- ✅ No more import errors
- ✅ Build should complete successfully

## Status

✅ **FIXED** - All 4 attendance API routes now use correct authentication imports

---

**Fixed**: 2026-02-12  
**Files Updated**: 4 API route files  
**Pattern**: Changed from `getServerSession` to `auth()`
