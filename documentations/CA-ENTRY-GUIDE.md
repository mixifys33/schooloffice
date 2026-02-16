# 📝 How to Enter CA Marks - Quick Guide

## 🚨 Current Issue

The Assessment Overview page is showing an error. This is likely due to:

1. Database connection issue
2. Missing staff profile setup
3. No current term configured

## ✅ Direct Access Solution

### **Option 1: Direct URL Access (Bypass Overview)**

If you know your class and subject IDs, go directly to the CA entry page:

```
/class-teacher/assessments/ca?classId=YOUR_CLASS_ID&subjectId=YOUR_SUBJECT_ID
```

### **Option 2: Use the Classes API First**

1. **Get Your Assigned Classes:**
   - API: `GET /api/class-teacher/assessments/classes`
   - This will return your assigned classes and subjects

2. **Then Access CA Entry Page:**
   - Use the classId and subjectId from step 1
   - Navigate to: `/class-teacher/assessments/ca?classId=XXX&subjectId=YYY`

### **Option 3: Fix the Overview API**

The overview API might be failing because:

**Check 1: Staff Profile**

- Ensure your user account has a staff profile in the database
- Staff profile must have `primaryRole` or `secondaryRoles` including `CLASS_TEACHER`

**Check 2: Current Term**

- Ensure there's an active academic term
- Term must have `startDate <= today <= endDate`

**Check 3: Staff Subject Assignments**

- Ensure you have `StaffSubject` records linking you to classes and subjects

## 🔧 Diagnostic Steps

### Step 1: Check Your Staff Profile

```javascript
// Run this in browser console on any authenticated page
fetch("/api/class-teacher/assessments/classes")
  .then((r) => r.json())
  .then((data) => console.log("Your classes:", data));
```

### Step 2: If Classes API Works

You'll get a response like:

```json
{
  "classes": [
    {
      "classId": "abc123",
      "className": "Primary 1",
      "subjectId": "xyz789",
      "subjectName": "Mathematics"
    }
  ]
}
```

### Step 3: Access CA Entry Directly

Use the IDs from step 2:

```
/class-teacher/assessments/ca?classId=abc123&subjectId=xyz789
```

## 📋 CA Entry Workflow

Once you're on the CA entry page:

1. **Create New CA Entry** (if none exists)
   - Click "+" or "Create CA Entry" button
   - Fill in:
     - Name: e.g., "Midterm Test"
     - Type: "test" or "assignment"
     - Max Score: e.g., 10
     - Description: (optional)
   - Click "Create"

2. **Enter Student Marks**
   - You'll see a list of all students
   - Enter scores in the input fields
   - Scores must be between 0 and max score

3. **Save or Submit**
   - **Save Draft**: Saves marks but allows editing later
   - **Submit**: Locks marks (cannot edit after submission)

## 🐛 Troubleshooting

### Error: "Failed to fetch assessment overview"

**Solution**: Use direct URL access (Option 1 or 2 above)

### Error: "No staff profile found"

**Solution**: Contact admin to create your staff profile

### Error: "No active term found"

**Solution**: Contact admin to set up current academic term

### Error: "Access denied"

**Solution**: Contact admin to assign you to classes/subjects

## 📞 Need Help?

If none of these work, check:

1. Browser console for detailed error messages (F12 → Console tab)
2. Network tab to see API responses (F12 → Network tab)
3. Server logs for backend errors

---

**Quick Test**: Try accessing `/api/class-teacher/assessments/classes` in your browser to see if you have any assigned classes.
