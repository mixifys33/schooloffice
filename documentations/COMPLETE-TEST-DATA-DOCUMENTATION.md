# Complete Test Data Documentation

> **Generated**: 2026-02-10  
> **Script**: `seed-complete-school-data.js`  
> **School**: Rwenzori Valley Primary School

---

## 📊 Overview

This comprehensive seeding script populates the database with realistic, interconnected test data covering **ALL** school-related models. The data is designed to be realistic, with proper relationships, and suitable for testing all features of the school management system.

---

## 🎯 Data Coverage

### ✅ 1. Academic Structure (100% Complete)

**Academic Year**:

- 1 academic year (2026)
- Status: Current and active

**Terms**:

- Term 1: Feb 1 - May 30, 2026 (Current)
- Term 2: Jun 14 - Sep 25, 2026
- Term 3: Oct 5 - Dec 15, 2026

**Classes**:

- 7 classes (P.1 to P.7)
- Capacity: 120 students per class

**Streams**:

- 21 streams (A, B, C for each class)
- Capacity: 40 students per stream

**Subjects**:

- 7 subjects per class:
  - English (5 periods/week)
  - Mathematics (5 periods/week)
  - Science (4 periods/week)
  - Social Studies (4 periods/week)
  - Religious Education (2 periods/week)
  - Creative Arts (2 periods/week)
  - Physical Education (2 periods/week)

---

### ✅ 2. Staff & Users (100% Complete)

**Administrative Staff** (4):

- Head Teacher (Margaret Tumusiime) - SCHOOL_ADMIN
- Deputy Head Teacher (John Mugisha) - DEPUTY
- Director of Studies (Sarah Byaruhanga) - DOS
- Bursar (David Muhwezi) - ACCOUNTANT

**Class Teachers** (21):

- 3 teachers per class level
- Realistic Ugandan names
- Employee numbers: RVP005 to RVP025
- All have teacher codes and qualifications

**Total Staff**: 25 members

**User Accounts**:

- All staff have user accounts
- Default password: `password123`
- Email format: `[role]@rwenzori.ac.ug` or `teacher[N]@rwenzori.ac.ug`

---

### ✅ 3. Students & Guardians (100% Complete)

**Students**:

- **Total**: 630 students (30 per stream)
- **Distribution**: Evenly distributed across 21 streams
- **Gender**: Random 50/50 split
- **Admission Numbers**: RVP1000 to RVP1629
- **Age Range**: 6-16 years old (realistic for P.1 to P.7)
- **Status**: All ACTIVE
- **Enrollment Date**: January 15, 2024

**Guardians**:

- **Total**: 630 guardians (1 per student)
- **Relationship**: 50% fathers, 50% mothers
- **Contact**: All have phone numbers (Ugandan format: 07XXXXXXXX)
- **Email**: 70% have email addresses
- **Status**: All ACTIVE with consent given

**Student-Guardian Links**:

- All students linked to their guardians
- Primary guardian: Yes
- Financially responsible: Yes
- Receives academic messages: Yes
- Receives finance messages: Yes

---

### ✅ 4. Subject Assignments (100% Complete)

**Class-Subject Assignments**:

- All 7 subjects assigned to all 7 classes
- Total: 49 class-subject combinations
- Max mark: 100 for all subjects
- All appear on report cards
- All affect position

**Staff-Subject Assignments**:

- All teachers assigned to teach subjects
- Distribution: Rotated across classes and subjects
- Assigned by: DoS
- Primary teacher: Yes

---

### ✅ 5. Grading Systems (100% Complete)

**Categories** (3):

- FINAL - For final report cards (Exam + CA)
- CA_ONLY - For CA assessments only
- EXAM_ONLY - For exam assessments only

**Grade Ranges** (5 per category):

- A: 80-100 (4.0 points) - Excellent
- B: 70-79 (3.0 points) - Very Good
- C: 60-69 (2.0 points) - Good
- D: 50-59 (1.0 points) - Pass
- F: 0-49 (0.0 points) - Fail

**Total**: 3 grading systems, 15 grade ranges

---

### ✅ 6. Fee Structures & Payments (100% Complete)

**Fee Structures**:

- Created for all classes (P.1 to P.7)
- Created for all terms (Term 1, 2, 3)
- Total: 21 fee structures
- Tuition increases with class level:
  - P.1: UGX 160,000
  - P.2: UGX 170,000
  - P.3: UGX 180,000
  - P.4: UGX 190,000
  - P.5: UGX 200,000
  - P.6: UGX 210,000
  - P.7: UGX 220,000

**Payments**:

- 70% of students have paid
- 80% full payment, 20% partial payment
- Payment methods: Cash, Mobile Money, Bank Transfer
- Payment dates: February 1-28, 2026
- Total: ~441 payments

---

### ✅ 7. CA Entries (Continuous Assessment) (100% Complete)

**Structure**:

- 3 CA entries per subject per student:
  - Assignment 1 (20 marks)
  - Test 1 (30 marks)
  - Assignment 2 (20 marks)

**Distribution**:

- All students in all subjects
- Total: **13,230 CA entries** (630 students × 7 subjects × 3 CAs)

**Scores**:

- Realistic distribution:
  - 10% excellent (80-100%)
  - 30% good (65-79%)
  - 40% average (50-64%)
  - 20% poor (30-49%)

**Status**:

- 70% SUBMITTED
- 30% DRAFT

**Dates**: February 1 - April 30, 2026

---

### ✅ 8. Exam Entries (100% Complete)

**Structure**:

- 1 exam entry per subject per student
- Max score: 100 marks

**Distribution**:

- All students in all subjects
- Total: **4,410 exam entries** (630 students × 7 subjects)

**Scores**:

- Realistic distribution (same as CA)

**Status**:

- 80% SUBMITTED
- 20% DRAFT

**Dates**: May 1-25, 2026

---

### ✅ 9. Attendance Records (100% Complete)

**Coverage**:

- Daily attendance for all students
- Period: February 1 - April 10, 2026 (50 school days)
- Weekdays only (Mon-Fri)

**Distribution**:

- Total: **31,500 attendance records** (630 students × 50 days)

**Status**:

- 95% PRESENT
- 2.5% ABSENT
- 2.5% LATE

**Recorded by**: Class teachers

---

### ✅ 10. DoS Curriculum Subjects (100% Complete)

**Structure**:

- All subjects assigned to all classes
- Periods per week configured
- Total: **49 curriculum subjects** (7 classes × 7 subjects)

**Status**: All active

---

### ✅ 11. DoS Timetables (100% Complete)

**Structure**:

- 1 timetable per class for Term 1
- Total: **7 timetables**

**Status**:

- All APPROVED
- All LOCKED (published)

**Timetable Entries**:

- Monday to Friday (5 days)
- 8 periods per day
- Total: **280 timetable entries** (7 classes × 40 slots)

**Details**:

- Subject rotation
- Teacher assignments
- Room assignments (Room 1-20)

---

### ✅ 12. Discipline Cases (100% Complete)

**Coverage**:

- 10% of students have discipline cases
- Total: **63 discipline cases**

**Types**:

- MINOR, MAJOR, CRITICAL (random distribution)

**Actions**:

- WARNING, DETENTION, SUSPENSION (random distribution)

**Dates**: February 1 - April 10, 2026

---

### ✅ 13. Messages & Communication (100% Complete)

**Structure**:

- Fee reminder messages sent to 30% of guardians
- Total: **189 messages**

**Channel**: SMS

**Type**: AUTOMATED

**Status**: DELIVERED

**Content**: "Dear parent, this is a reminder about school fees payment. Thank you."

**Dates**: February 1 - April 10, 2026

---

### ✅ 14. Teacher Alerts (100% Complete)

**Coverage**:

- 10 teachers have pending alerts
- Total: **10 teacher alerts**

**Type**: CA_PENDING_SUBMISSION

**Priority**: 1-5 (random)

**Due Date**: May 1, 2026

**Message**: "You have pending CA submissions for Mathematics"

---

### ✅ 15. Competencies (100% Complete)

**Structure**:

- 1 core competency per subject per class
- Total: **49 competencies** (7 classes × 7 subjects)

**Competency Progress**:

- 20% of students per class have progress records
- Total: **~294 competency progress records**

**Levels**: 1-4 (random)

**Evidence**: "Demonstrated competency in class activities"

**Assessed by**: DoS

**Dates**: February 1 - April 10, 2026

---

### ✅ 16. Announcements (100% Complete)

**Total**: 2 announcements

**Announcements**:

1. **Term 1 Opening**
   - Priority: HIGH
   - Published: January 25, 2026
   - Expires: February 5, 2026
   - Content: "Welcome back to school! Term 1 begins on February 1st, 2026."

2. **Mid-Term Break**
   - Priority: MEDIUM
   - Published: March 1, 2026
   - Expires: March 20, 2026
   - Content: "Mid-term break will be from March 15-20, 2026."

---

### ✅ 17. Staff Responsibilities (100% Complete)

**Coverage**:

- 1 responsibility per class teacher
- Total: **7 staff responsibilities**

**Type**: CLASS_TEACHER_DUTY

**Details**: Assigned to specific classes

**Assigned by**: DoS

---

### ✅ 18. Staff Tasks (100% Complete)

**Coverage**:

- 10 teachers have tasks
- Total: **10 staff tasks**

**Task**: "Submit Term 1 CA Marks"

**Type**: SUBMIT_MARKS

**Linked Module**: ACADEMICS

**Deadline**: May 1, 2026

**Status**: 50% COMPLETED, 50% PENDING

---

## 📈 Total Data Summary

| Category                       | Count  |
| ------------------------------ | ------ |
| **Academic Structure**         |        |
| Academic Years                 | 1      |
| Terms                          | 3      |
| Classes                        | 7      |
| Streams                        | 21     |
| Subjects                       | 7      |
| Class-Subject Assignments      | 49     |
| **People**                     |        |
| Staff                          | 25     |
| Students                       | 630    |
| Guardians                      | 630    |
| Student-Guardian Links         | 630    |
| Staff-Subject Assignments      | 147    |
| **Assessments**                |        |
| Grading Systems                | 3      |
| Grade Ranges                   | 15     |
| CA Entries                     | 13,230 |
| Exam Entries                   | 4,410  |
| Competencies                   | 49     |
| Competency Progress            | 294    |
| **Attendance**                 |        |
| Attendance Records             | 31,500 |
| **Timetables**                 |        |
| DoS Curriculum Subjects        | 49     |
| DoS Timetables                 | 7      |
| Timetable Entries              | 280    |
| **Finance**                    |        |
| Fee Structures                 | 21     |
| Payments                       | 441    |
| **Discipline & Communication** |        |
| Discipline Cases               | 63     |
| Messages                       | 189    |
| Announcements                  | 2      |
| **Staff Management**           |        |
| Teacher Alerts                 | 10     |
| Staff Responsibilities         | 7      |
| Staff Tasks                    | 10     |

**GRAND TOTAL**: **52,000+ records** across all models

---

## 🔐 Login Credentials

### Administrative Staff

| Role         | Email                      | Password    |
| ------------ | -------------------------- | ----------- |
| Head Teacher | headteacher@rwenzori.ac.ug | password123 |
| Deputy       | deputy@rwenzori.ac.ug      | password123 |
| DoS          | dos@rwenzori.ac.ug         | password123 |
| Bursar       | bursar@rwenzori.ac.ug      | password123 |

### Teachers

| Range        | Email Pattern                                       | Password    |
| ------------ | --------------------------------------------------- | ----------- |
| Teacher 5-25 | teacher5@rwenzori.ac.ug to teacher25@rwenzori.ac.ug | password123 |

---

## 🚀 How to Run

1. **Ensure database is accessible**:

   ```bash
   # Check DATABASE_URL in .env
   ```

2. **Run the seeding script**:

   ```bash
   node seed-complete-school-data.js
   ```

3. **Expected duration**: 5-10 minutes (depending on system performance)

4. **Verify data**:
   - Login to the application
   - Check all sections have data
   - Verify relationships are correct

---

## ✅ Data Quality Features

### Realistic Data

- ✅ Ugandan names (first and last names)
- ✅ Ugandan phone numbers (07XXXXXXXX format)
- ✅ Realistic email addresses
- ✅ Appropriate age ranges for students
- ✅ Realistic score distributions
- ✅ Realistic attendance rates (95% present)
- ✅ Realistic payment patterns (70% paid)

### Proper Relationships

- ✅ All students linked to classes and streams
- ✅ All students linked to guardians
- ✅ All subjects assigned to classes
- ✅ All teachers assigned to subjects
- ✅ All CA/Exam entries linked to students, subjects, teachers, and terms
- ✅ All attendance records linked to students and classes
- ✅ All timetable entries linked to subjects and teachers
- ✅ All competencies linked to classes and subjects

### Data Integrity

- ✅ No orphaned records
- ✅ All foreign keys valid
- ✅ All required fields populated
- ✅ Dates are realistic and in correct order
- ✅ Scores within valid ranges
- ✅ Status values are valid enums

---

## 🎯 Testing Coverage

This data allows you to test:

### Academic Features

- ✅ Class and stream management
- ✅ Subject assignments
- ✅ Timetable creation and viewing
- ✅ Curriculum management

### Assessment Features

- ✅ CA entry and grading
- ✅ Exam entry and grading
- ✅ Grade calculation
- ✅ Report card generation
- ✅ Competency tracking

### Attendance Features

- ✅ Daily attendance marking
- ✅ Attendance reports
- ✅ Attendance statistics

### Finance Features

- ✅ Fee structure management
- ✅ Payment recording
- ✅ Fee balance tracking
- ✅ Payment reports

### Communication Features

- ✅ SMS sending
- ✅ Message templates
- ✅ Announcement creation
- ✅ Guardian communication

### Staff Features

- ✅ Staff management
- ✅ Teacher alerts
- ✅ Staff responsibilities
- ✅ Staff tasks
- ✅ Subject assignments

### Discipline Features

- ✅ Discipline case recording
- ✅ Discipline reports

### DoS Features

- ✅ Curriculum management
- ✅ Timetable creation
- ✅ Assessment monitoring
- ✅ Teacher assignments

---

## 📝 Notes

1. **Idempotent**: The script checks for existing records before creating new ones, so it can be run multiple times safely.

2. **Performance**: Creating 52,000+ records takes time. Be patient and let the script complete.

3. **Cleanup**: If you need to start fresh, delete all records from the database before running the script again.

4. **Customization**: You can modify the script to:
   - Change the number of students per stream
   - Adjust score distributions
   - Add more CA entries
   - Create more terms
   - Add more subjects

5. **Production**: This is TEST DATA ONLY. Do not use in production environments.

---

**Version**: v1.0  
**Last Updated**: 2026-02-10  
**Script**: `seed-complete-school-data.js`
