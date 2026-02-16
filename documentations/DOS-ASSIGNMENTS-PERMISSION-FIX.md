# DoS Assignments Permission Fix

**Date**: 2026-02-13  
**Status**: ✅ **FIXED**

## Error Summary

**Error**: `403 Forbidden - Insufficient permissions` when accessing `/api/staff/assignments/truth-table`

**Symptoms**:
- DoS users unable to view teaching assignments
- Console error: "Insufficient permissions"
- API returning 403 status code
- Terminal showing: `GET /api/staff/assignments/truth-table 403`

---

## Root Cause

The API endpoint was checking for `Role.DOS` in the user's role, but DoS users have `StaffRole.DOS` in their staff record, not in their