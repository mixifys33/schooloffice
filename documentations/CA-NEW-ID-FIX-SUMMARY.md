# CA Entry "new" ID Auto-Save Error - Fix Summary

**Date**: 2026-02-09  
**Status**: ✅ FIXED

## Problem

When entering marks for a new subject that doesn't have any CA entries yet, the system was throwing this error:

```
Malformed ObjectID: provided hex string representation must be exactly 12 bytes, 
instead got: "new", length 3
```

## Root Cause

1. When a subject has no CA entries, the GET API returns a placeholder entry with `id: 'new'`
2. User tries to enter scores for this placeholder entry
3. Auto-save function attempts to save scores using `caId: 'new'`
4. Backend tries to query MongoDB with `'new'` as an Object