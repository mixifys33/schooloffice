/**
 * Comprehensive Teacher Portal Guide
 * This knowledge base helps the AI assistant provide accurate guidance
 */

export const TEACHER_PORTAL_GUIDE = `
# SCHOOLOFFICE TEACHER PORTAL - COMPLETE GUIDE

## NAVIGATION & LAYOUT
The teacher portal has a sidebar navigation with the following sections:
- Dashboard (Home icon) - Overview of your classes and quick stats
- Classes (Users icon) - View and manage your assigned classes
- CA Entry (ClipboardList icon) - Enter continuous assessment marks
- Exam Entry (FileText icon) - Enter exam scores
- Reports (BarChart3 icon) - Generate and view student performance reports
- Attendance (Calendar icon) - Take and manage student attendance
- Timetable (Clock icon) - View your teaching schedule
- Messages (MessageSquare icon) - Communicate with students and parents
- Profile (User icon) - Manage your personal information

## DASHBOARD
**Location:** Click "Dashboard" in sidebar or navigate to /teacher/dashboard
**Features:**
- Quick overview of all assigned classes
- Student count per class
- Recent activities
- Quick action buttons to enter CA/Exam marks
- Performance statistics

## CLASSES
**Location:** Click "Classes" in sidebar or navigate to /teacher/classes
**What you can do:**
- View all classes you teach
- See student lists for each class
- View class details (subject, level, student count)
- Access quick actions for CA entry, exam entry, and reports
- Filter classes by subject or level

## CA ENTRY (Continuous Assessment)
**Location:** Click "CA Entry" in sidebar or navigate to /teacher/ca-entry

**Step-by-step process:**
1. Select the academic term from dropdown
2. Choose your class from the list
3. Select the subject you're entering marks for
4. Choose the CA activity type (Quiz, Assignment, Test, etc.)
5. Enter the maximum score for this activity
6. Enter individual student scores
7. Click "Save" to submit

**Important notes:**
- You can enter multiple CA activities per term
- Each activity can have different maximum scores
- Students without scores will show as "-"
- You can edit CA entries before the term closes
- CA contributes to the final grade calculation

**CA Activity Types:**
- Quiz - Short assessments
- Assignment - Homework or projects
- Test - Formal tests
- Classwork - In-class activities
- Project - Long-term projects
- Participation - Class participation scores

## EXAM ENTRY
**Location:** Click "Exam Entry" in sidebar or navigate to /teacher/exam-entry

**Step-by-step process:**
1. Select the academic term
2. Choose your class
3. Select the subject
4. Enter the maximum exam score (usually 100)
5. Enter each student's exam score
6. Click "Save" to submit

**Important notes:**
- Exam entry is usually done once per term
- Exam scores are combined with CA scores for final grades
- You can edit exam scores before term closes
- Missing exam scores will show as "-"

## REPORTS
**Location:** Click "Reports" in sidebar or navigate to /teacher/reports

**What you can view:**
- Class performance overview
- Individual student performance
- CA vs Exam comparison
- Grade distribution
- Student rankings
- Performance trends

**How to generate reports:**
1. Select your class from dropdown
2. Choose the term/academic year
3. View statistics:
   - CA Average
   - Exam Average
   - Final Average
   - Completion rates
4. Export options:
   - Download PDF (colorful version)
   - Export CSV (Excel-compatible)
   - Print B&W version

**Report features:**
- Search students by name or admission number
- Filter by grade
- Sort by any column (name, scores, grades)
- View competency status (Achieved/Not Achieved)

## ATTENDANCE
**Location:** Click "Attendance" in sidebar or navigate to /teacher/attendance

**How to take attendance:**
1. Select your class
2. Choose the date (defaults to today)
3. Mark each student as:
   - Present (green checkmark)
   - Absent (red X)
   - Late (yellow clock)
   - Excused (blue icon)
4. Add notes if needed
5. Click "Save Attendance"

**Attendance features:**
- View attendance history
- Generate attendance reports
- See attendance statistics per student
- Export attendance records
- Bulk mark all present/absent

## TIMETABLE
**Location:** Click "Timetable" in sidebar or navigate to /teacher/timetable

**What you can see:**
- Your weekly teaching schedule
- Class periods with times
- Room/location assignments
- Subject and class details
- Free periods

**Timetable views:**
- Weekly view (default)
- Daily view
- Print-friendly version

## MESSAGES
**Location:** Click "Messages" in sidebar or navigate to /teacher/messages

**How to send messages:**
1. Click "New Message" button
2. Select recipients:
   - Individual students
   - Entire class
   - Parents
   - Other teachers
3. Write your message
4. Add attachments if needed
5. Click "Send"

**Message features:**
- Inbox for received messages
- Sent messages history
- Mark as read/unread
- Reply to messages
- Search messages
- Filter by sender/date

## PROFILE
**Location:** Click "Profile" in sidebar or navigate to /teacher/profile

**What you can manage:**
- Personal information
- Contact details
- Profile photo
- Password change
- Notification preferences
- Teaching subjects
- Assigned classes
- Workload information

## COMMON TASKS & SHORTCUTS

### Quick CA Entry:
Dashboard → Click "Enter CA" on any class card → Select activity → Enter marks

### Quick Exam Entry:
Dashboard → Click "Enter Exam" on any class card → Enter scores

### View Class Performance:
Classes → Select class → Click "View Reports"

### Take Attendance:
Attendance → Select class → Mark students → Save

### Generate Report:
Reports → Select class → Choose report type → Download/Print

## TIPS & BEST PRACTICES

1. **Regular Updates:** Enter CA marks regularly, don't wait until end of term
2. **Double Check:** Always review scores before saving
3. **Backup:** Download reports regularly as backup
4. **Attendance:** Take attendance at the start of each class
5. **Communication:** Use messages for parent communication
6. **Reports:** Generate reports before parent-teacher meetings

## TROUBLESHOOTING

**Can't see my classes?**
- Contact admin to verify class assignments
- Check if you're logged in with correct account

**Can't enter marks?**
- Verify the term is active
- Check if you have permission for that class
- Ensure student is enrolled in the class

**Scores not saving?**
- Check internet connection
- Verify all required fields are filled
- Try refreshing the page

**Report not generating?**
- Ensure marks are entered for the selected term
- Check if students are enrolled
- Try a different browser

## KEYBOARD SHORTCUTS
- Tab: Move to next field when entering marks
- Enter: Save current entry
- Ctrl/Cmd + S: Quick save
- Esc: Close modal/dialog

## SUPPORT
If you need help:
1. Use the AI Self Help assistant (purple button)
2. Contact your school admin
3. Check the help documentation at /documentation
4. Email support@schooloffice.com

## GRADING SYSTEM
Grades are calculated based on:
- CA Score (usually 20% of total)
- Exam Score (usually 80% of total)
- Final Score = CA + Exam

Grade Ranges (typical):
- A: 80-100 (Excellent)
- B: 70-79 (Very Good)
- C: 60-69 (Good)
- D: 50-59 (Pass)
- F: Below 50 (Fail)

Note: Your school may have different grade ranges.

## IMPORTANT REMINDERS
- Deadlines for CA entry are set by admin
- Exam scores must be entered before report generation
- Attendance affects student performance tracking
- Keep your profile information up to date
- Regular communication with parents is encouraged
`

export const getTeacherPortalContext = () => {
  return TEACHER_PORTAL_GUIDE
}
