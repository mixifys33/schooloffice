/**
 * Documentation Indexer for AI Assistant
 * Provides documentation snippets for context
 * Note: File reading happens server-side in the API route
 */

export interface DocumentationIndex {
  quickStart: string[]
  features: string[]
  troubleshooting: string[]
  apiGuides: string[]
}

export interface DocumentFile {
  name: string
  content: string
  category: string
}

/**
 * Documentation content snippets for AI context
 * These are key excerpts from the documentation folder
 */
export const documentationSnippets = {
  quickStart: `
QUICK START GUIDE:
1. Login with school code (e.g., STMARYS, GREENHILL)
2. Enter email/username/phone and password
3. Navigate to your role-specific dashboard
4. Set up academic year and terms in Settings (Admin only)
5. Create classes and assign teachers
6. Start entering marks and attendance

FIRST-TIME SETUP (Admin):
- Go to Settings → Academic Year
- Create current academic year
- Add terms (Term 1, Term 2, Term 3)
- Set current term
- Create classes in Classes section
- Add subjects to classes
- Assign teachers to subjects
`,

  authentication: `
LOGIN PROCESS:
- School-first authentication (school code required)
- Supports: Email, Username, or Phone number
- Password requirements: Min 8 characters
- Account locks after 5 failed attempts (15 min lockout)
- Session timeout: 2 hours inactivity, 24 hours max

COMMON LOGIN ERRORS:
- "School not found": Invalid school code
- "Invalid credentials": Wrong email/password
- "Account locked": Too many failed attempts
- "Session expired": Need to log in again
`,

  marksEntry: `
MARKS ENTRY (Teacher):
1. Go to Teacher Dashboard → Marks Entry
2. Select Term, Class, and Subject
3. Choose assessment type (CA or Exam)
4. Enter marks for each student
5. Marks auto-save as you type
6. Submit for DOS approval when complete

CA MARKS:
- Multiple CA entries per term
- Each CA has a weight/percentage
- Final CA score calculated automatically

EXAM MARKS:
- One exam per term per subject
- Requires DOS approval before report generation
`,

  dosApprovals: `
DOS APPROVALS:
1. Go to DOS Dashboard → Approvals
2. Review pending marks submissions
3. Check for errors or anomalies
4. Approve or reject with comments
5. Approved marks appear in reports

REPORT GENERATION:
1. Ensure all marks are approved
2. Go to DOS → Reports
3. Select term and class
4. Generate reports (individual or bulk)
5. Download or distribute to parents
`,

  bursarFeatures: `
BURSAR SECTION:
- Fee structure management
- Payment recording
- Fee balance tracking
- Financial reports
- Discount management
- Payment reminders via SMS

FEE MANAGEMENT:
1. Set up fee structures per class
2. Record payments as received
3. Track balances automatically
4. Generate financial reports
5. Send payment reminders
`,

  commonIssues: `
COMMON ISSUES & SOLUTIONS:

1. "No active term found"
   → Admin needs to set current term in Settings

2. "Cannot enter marks"
   → Check if term is active and you're assigned to the subject

3. "Report generation failed"
   → Ensure all marks are approved by DOS

4. "Cannot see students"
   → Check if students are enrolled in the class

5. "Permission denied"
   → Contact admin to verify your role and permissions

6. "Session expired"
   → Log in again (sessions expire after 2 hours inactivity)

7. "School code not found"
   → Verify school code with your administrator

8. "Upload failed"
   → Check file size (max 50MB) and internet connection
`,

  roles: `
USER ROLES & PERMISSIONS:

SUPER ADMIN:
- Manage multiple schools
- System-wide configuration
- No school code required for login

SCHOOL ADMIN:
- School settings and configuration
- User management
- Academic year setup
- Class and subject management

TEACHER:
- Mark entry (CA and Exam)
- Attendance marking
- View assigned classes
- Student performance tracking

DOS (Director of Studies):
- Approve marks
- Generate reports
- Monitor academic performance
- Curriculum management
- Timetable generation

BURSAR:
- Fee management
- Payment recording
- Financial reports
- Discount management

CLASS TEACHER:
- Class-specific attendance
- View class performance
- Student monitoring

PARENT:
- View student reports
- Check attendance
- View fee balance

STUDENT:
- View own marks and reports
- Check attendance
- View timetable
`,

  attendance: `
ATTENDANCE MANAGEMENT:

TEACHER ATTENDANCE:
1. Go to Teacher Dashboard → Attendance
2. Select class and date
3. Mark students as Present/Absent
4. Submit attendance
5. Can edit same-day attendance

CLASS TEACHER ATTENDANCE:
- Similar to teacher but class-specific
- Can view attendance history
- Generate attendance reports

ATTENDANCE REPORTS:
- Daily, weekly, monthly summaries
- Student-specific attendance records
- Class attendance statistics
`,

  timetable: `
TIMETABLE MANAGEMENT:

AUTO-GENERATION (DOS):
1. Go to DOS → Timetable
2. Set periods per day
3. Configure break times
4. Assign subjects to periods
5. System auto-generates avoiding conflicts

MANUAL TIMETABLE:
- Create custom timetables
- Assign teachers to periods
- Set room allocations
- Print or download timetables

VIEW TIMETABLE:
- Teachers see their teaching schedule
- Students see class timetable
- Parents can view student timetable
`,
}

/**
 * Get relevant documentation based on context
 * Uses hardcoded snippets (file reading happens server-side in API route)
 */
export function getRelevantDocs(context: string): string {
  const lowerContext = context.toLowerCase()
  let docs = ''

  if (lowerContext.includes('login') || lowerContext.includes('sign in') || lowerContext.includes('auth')) {
    docs += documentationSnippets.authentication + '\n\n'
  }

  if (lowerContext.includes('mark') || lowerContext.includes('grade') || lowerContext.includes('score')) {
    docs += documentationSnippets.marksEntry + '\n\n'
  }

  if (lowerContext.includes('dos') || lowerContext.includes('approv') || lowerContext.includes('report')) {
    docs += documentationSnippets.dosApprovals + '\n\n'
  }

  if (lowerContext.includes('fee') || lowerContext.includes('payment') || lowerContext.includes('bursar')) {
    docs += documentationSnippets.bursarFeatures + '\n\n'
  }

  if (lowerContext.includes('attendance') || lowerContext.includes('present') || lowerContext.includes('absent')) {
    docs += documentationSnippets.attendance + '\n\n'
  }

  if (lowerContext.includes('timetable') || lowerContext.includes('schedule')) {
    docs += documentationSnippets.timetable + '\n\n'
  }

  if (lowerContext.includes('role') || lowerContext.includes('permission') || lowerContext.includes('access')) {
    docs += documentationSnippets.roles + '\n\n'
  }

  if (lowerContext.includes('error') || lowerContext.includes('issue') || lowerContext.includes('problem') || lowerContext.includes('help')) {
    docs += documentationSnippets.commonIssues + '\n\n'
  }

  // Default to quick start if no specific context
  if (!docs) {
    docs = documentationSnippets.quickStart
  }

  return docs
}
