# 🔧 Exam API Troubleshooting Guide

**Issue**: Still getting "Unexpected token '<', '<!DOCTYPE'... is not valid JSON"  
**Status**: Investigating

---

## ✅ What I've Done

1. ✅ Created the API endpoint: `src/app/api/class-teacher/assessments/exam/route.ts`
2. ✅ Verified the file exists and has no TypeScript errors
3. ✅ Restarted the development server
4. ✅ Added better error handling to the page

---

## 🔍 Possible Causes

### Cause 1: Server Not Fully Compiled
**Issue**: Next.js Turbopack may not have compiled the new API route yet  
**Solution**: 
1. **Hard refresh** the browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Clear browser cache**
3. **Wait 30 seconds** for Turbopack to compile

### Cause 2: Route Not Registered
**Issue**: Next.js may need a full restart to register new API routes  
**Solution**:
1. Stop the server (Ctrl + C in terminal)
2. Delete `.next` folder: `rmdir /s /q .next` (Windows) or `rm -rf .next` (Mac/Linux)
3. Restart: `npm run dev`

### Cause 3: Wrong URL Path
**Issue**: The API might be at a different path  
**Check**: The page calls `/api/class-teacher/assessments/exam`  
**File location**: `src/app/api/class-teacher/assessments/exam/route.ts`  
**Should match**: ✅ Paths match correctly

### Cause 4: Authentication Issue
**Issue**: API requires authentication, returns HTML login page  
**Solution**: Make sure you're logged in before accessing the page

---

## 🚀 Quick Fix Steps

### Step 1: Hard Refresh Browser
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Step 2: Check Browser Console
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for the API call to `/api/class-teacher/assessments/exam`
5. Check:
   - Status code (should be 200, not 404)
   - Response type (should be JSON, not HTML)
   - Response content

### Step 3: Check Server Logs
Look at the terminal where `npm run dev` is running:
- Should see: `GET /api/class-teacher/assessments/exam 200 in XXXms`
- If you see 404: API route not registered
- If you see 500: Server error in the API

### Step 4: Full Server Restart
```bash
# Stop server (Ctrl + C)

# Delete build cache
rmdir /s /q .next

# Restart server
npm run dev

# Wait for "Ready in XXs" message
```

---

## 🔍 Debug Information

### Check API File Exists
```bash
# Windows
dir src\app\api\class-teacher\assessments\exam\route.ts

# Should show the file
```

### Check API Response Manually
1. Login to the application
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run this code:
```javascript
fetch('/api/class-teacher/assessments/exam?classId=YOUR_CLASS_ID&subjectId=YOUR_SUBJECT_ID')
  .then(r => {
    console.log('Status:', r.status)
    console.log('Content-Type:', r.headers.get('content-type'))
    return r.text()
  })
  .then(text => {
    console.log('Response:', text.substring(0, 500))
    if (text.startsWith('{')) {
      console.log('✅ Response is JSON')
    } else {
      console.log('❌ Response is HTML')
    }
  })
```

---

## 📊 Expected vs Actual

### Expected Behavior
```
Request: GET /api/class-teacher/assessments/exam?classId=XXX&subjectId=YYY
Response: 200 OK
Content-Type: application/json
Body: { "class": {...}, "subject": {...}, ... }
```

### Current Behavior (Error)
```
Request: GET /api/class-teacher/assessments/exam?classId=XXX&subjectId=YYY
Response: 404 Not Found (or other error)
Content-Type: text/html
Body: <!DOCTYPE html>...
```

---

## 🎯 What to Check Now

### 1. Browser Network Tab
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Refresh the page
- [ ] Find the API call
- [ ] Check status code
- [ ] Check response type
- [ ] Check response content

### 2. Server Terminal
- [ ] Look for compilation messages
- [ ] Look for API route registration
- [ ] Look for any errors
- [ ] Check if server is ready

### 3. Browser Console
- [ ] Look for error messages
- [ ] Check what the actual response is
- [ ] See if there are any other errors

---

## 💡 Most Likely Solution

**The server needs time to compile the new route.**

**Try this**:
1. ✅ Wait 30 seconds after server starts
2. ✅ Hard refresh browser (Ctrl + Shift + R)
3. ✅ Check browser console for new error messages
4. ✅ If still failing, do a full server restart

---

## 📞 If Still Not Working

### Share This Information:
1. **Browser Console Error**: Full error message
2. **Network Tab**: Status code and response type
3. **Server Logs**: Any errors or warnings
4. **URL Being Called**: Exact URL from Network tab

### Quick Test:
Try accessing the API directly in browser:
```
http://localhost:3000/api/class-teacher/assessments/exam?classId=695e2248c20bc8e1ef527a05&subjectId=696e52225fea8ffeb3bbc97e
```

**Expected**: JSON response or 401 Unauthorized  
**Not Expected**: HTML 404 page

---

## ✅ Next Steps

1. **Hard refresh** the browser
2. **Check** browser console and network tab
3. **Wait** for server to fully compile
4. **Try again** after 30 seconds
5. **Report back** with what you see

The API file is created correctly. The issue is likely just that the server needs to compile it or the browser cache needs to be cleared.
