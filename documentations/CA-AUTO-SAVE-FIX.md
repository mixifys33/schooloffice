# CA Auto-Save Error Fix

## 🐛 Error

```
Error: Auto-save failed
at ClassTeacherCAEntryPage.useCallback[autoSaveScores]
```

## ✅ Fix Applied

Improved error handling in the auto-save function to provide more detailed error information.

### Changes Made

**File**: `src/app/(back)/dashboard/class-teacher/assessments/ca/page.tsx`

**Before**:

```typescript
if (!response.ok) {
  throw new Error("Auto-save failed");
}
```

**After**:

```typescript
if (!response.ok) {
  const errorData = await response
    .json()
    .catch(() => ({ error: "Unknown error" }));
  console.error("❌ Auto-save failed:", response.status, errorData);
  throw new Error(
    `Auto-save failed: ${errorData.error || response.statusText}`,
  );
}
```

## 🔍 What This Does

1. **Captures error details** from the API response
2. **Logs detailed error** to console for debugging
3. **Includes error message** in the thrown error
4. **Keeps data in localStorage** if save fails (data won't be lost)

## 📊 Debugging Steps

Now when auto-save fails, check the browser console for detailed error messages:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages like:
   ```
   ❌ Auto-save failed: 401 {error: "Authentication required"}
   ❌ Auto-save failed: 404 {error: "CA entry not found"}
   ❌ Auto-save failed: 500 {error: "Database error"}
   ```

## 🔧 Common Causes

### 1. Authentication Issue

**Error**: `401 Authentication required`
**Solution**: User session expired, need to log in again

### 2. CA Entry Not Found

**Error**: `404 CA entry not found`
**Solution**: The CA entry ID is invalid or was deleted

### 3. No Access

**Error**: `403 Access denied`
**Solution**: Teacher doesn't have permission for this class/subject

### 4. Database Error

**Error**: `500 Failed to update scores`
**Solution**: Check database connection and Prisma schema

### 5. Network Error

**Error**: `Failed to fetch`
**Solution**: Check internet connection or API server

## 🎯 Testing

To test if auto-save is working:

1. Open CA assessment page
2. Select a class and subject
3. Select a CA entry
4. Enter a score for a student
5. Wait 2 seconds (auto-save debounce)
6. Check console for:
   - ✅ `Auto-saved scores to database` (success)
   - ❌ `Auto-save failed: ...` (error with details)

## 💾 Data Safety

Even if auto-save fails:

- ✅ Scores are kept in localStorage as backup
- ✅ Data won't be lost on page refresh
- ✅ Manual "Save Draft" button still works
- ✅ User can retry saving

## 🚀 Next Steps

If auto-save continues to fail:

1. **Check the console** for detailed error messages
2. **Try manual save** using "Save Draft" button
3. **Check network tab** in DevTools to see API response
4. **Verify database connection** is working
5. **Check user permissions** for the class/subject

---

**Fix Applied**: 2026-02-09
**Status**: ✅ Improved error handling
**Impact**: Better debugging information
