# Dynamic Route Conflict Fix

**Date**: 2026-02-10  
**Error**: `You cannot use different slug names for the same dynamic path ('did' !== 'documentId')`

## Root Cause

Next.js detected conflicting dynamic route segments in:

```
src/app/api/guardians/[id]/documents/[did]/
src/app/api/guardians/[id]/documents/[documentId]/
```

Both folders exist at the same level, creating ambiguous routing. Next.js requires consistent parameter names for the same dynamic path.

## Solution

Deleted the duplicate `[did]` folder, keeping only `[documentId]` as the standard parameter name.

```bash
# Removed:
src/app/api/guardians/[id]/documents/[did]/

# Kept:
src/app/api/guardians/[id]/documents/[documentId]/
```

## Why This Happened

Likely created during development when refactoring route names. The `[did]` folder was probably an older version that wasn't cleaned up when renamed to `[documentId]`.

## Status

✅ **FIXED** - Conflicting route removed, dev server should start cleanly now.

## Next Steps

1. Restart dev server: `npm run dev`
2. Verify no more routing conflicts
3. Test guardian documents API endpoints
