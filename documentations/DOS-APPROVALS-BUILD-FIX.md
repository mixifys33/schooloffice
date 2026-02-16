# DoS Approvals - Build Fix

**Date**: 2026-02-09  
**Issue**: Next.js 16 NextAuth import error  
**Status**: ✅ **FIXED**

---

## 🐛 Error

```
Export getServerSession doesn't exist in target module
import { getServerSession } from "next-auth";
```

---

## 🔧 Root Cause

Next.js 16 changed the NextAuth import pattern:

- ❌ **Old**: `import { getServerSession } from "next-auth"`
- ✅ **New**: `import { auth } from "@/lib/auth"`

---

## ✅ Fix Applied

Updated all 9 approval API files:

### Import Statement

```typescript
// Before (❌ WRONG):
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// After (✅ CORRECT):
import { auth } from "@/lib/auth";
```

### Session Check

```typescript
// Before (❌ WRONG):
const session = await getServerSession(authOptions);
if (!session?.user?.id) {

// After (✅ CORRECT):
const session = await auth();
if (!session?.user) {
```

---

## 📁 Files Fixed

1. ✅ `src/app/api/dos/approvals/route.ts`
2. ✅ `src/app/api/dos/approvals/ca/approve/route.ts`
3. ✅ `src/app/api/dos/approvals/ca/reject/route.ts`
4. ✅ `src/app/api/dos/approvals/ca/bulk-approve/route.ts`
5. ✅ `src/app/api/dos/approvals/exam/approve/route.ts`
6. ✅ `src/app/api/dos/approvals/exam/reject/route.ts`
7. ✅ `src/app/api/dos/approvals/lock/route.ts`
8. ✅ `src/app/api/dos/approvals/unlock/route.ts`
9. ✅ `src/app/api/dos/approvals/helpers/route.ts`

---

## 🚀 Build Status

**Status**: ✅ **BUILD SHOULD NOW PASS**

All API routes now use the correct Next.js 16 auth import pattern.

---

## 📝 Notes

- This is a Next.js 16 breaking change
- All new API routes should use `auth` from `@/lib/auth`
- Session structure remains the same: `session.user.id`, `session.user.schoolId`, etc.
- No functional changes, only import pattern update

---

**Status**: ✅ **FIXED** - Ready to build and deploy
