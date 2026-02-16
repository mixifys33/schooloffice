# Complete School Test Data Seeding

> **Purpose**: Populate Rwenzori Valley Primary School with comprehensive, realistic test data covering ALL school-related models.

---

## 🚀 Quick Start

```bash
# Run the seeding script
node seed-complete-school-data.js
```

**Duration**: 5-10 minutes  
**Records Created**: 52,000+

---

## 📁 Files

| File                                  | Purpose                         |
| ------------------------------------- | ------------------------------- |
| `seed-complete-school-data.js`        | Main seeding script             |
| `SEED-DATA-SUMMARY.md`                | Quick summary (READ THIS FIRST) |
| `COMPLETE-TEST-DATA-DOCUMENTATION.md` | Detailed documentation          |
| `README-SEED-DATA.md`                 | This file                       |

---

## 📊 What Gets Created

### Core Data

- ✅ 1 academic year, 3 terms
- ✅ 7 classes (P.1 to P.7)
- ✅ 21 streams (A, B, C per class)
- ✅ 7 subjects

### People

- ✅ 25 staff members (4 admin, 21 teachers)
- ✅ 630 students (30 per stream)
- ✅ 630 guardians (1 per student)

### Assessments

- ✅ 13,230 CA entries (3 per student per subject)
- ✅ 4,410 exam entries (1 per student per subject)
- ✅ 3 grading systems (FINAL, CA_ONLY, EXAM_ONLY)
- ✅ 49 competencies with progress tracking

### Attendance

- ✅ 31,500 attendance records (50 school days)

### Timetables

- ✅ 7 complete timetables (1 per class)
- ✅ 280 timetable entries

### Finance

- ✅ 21 fee structures
- ✅ 441 payments (70% of students)

### Other

- ✅ 63 discipline cases
- ✅ 189 SMS messages
- ✅ 10 teacher alerts
- ✅ 7 staff responsibilities
- ✅ 10 staff tasks
- ✅ 2 announcements

**TOTAL**: 52,088 records

---

## 🔐 Login After Seeding

| Role         | Email                                               | Password    |
| ------------ | --------------------------------------------------- | ----------- |
| Head Teacher | headteacher@rwenzori.ac.ug                          | password123 |
| Deputy       | deputy@rwenzori.ac.ug                               | password123 |
| DoS          | dos@rwenzori.ac.ug                                  | password123 |
| Bursar       | bursar@rwenzori.ac.ug                               | password123 |
| Teachers     | teacher5@rwenzori.ac.ug to teacher25@rwenzori.ac.ug | password123 |

---

## ✅ Data Quality

### Realistic

- Ugandan names (first and last)
- Ugandan phone numbers (07XXXXXXXX)
- Realistic email addresses
- Appropriate age ranges
- Realistic score distributions
- Realistic attendance rates (95% present)

### Connected

- All students linked to classes, streams, guardians
- All subjects assigned to classes and teachers
- All assessments linked to students, subjects, teachers, terms
- All attendance linked to students and classes
- All timetables linked to subjects and teachers

### Valid

- No orphaned records
- All foreign keys valid
- All required fields populated
- Dates in correct order
- Scores within valid ranges

---

## 🎯 What You Can Test

After seeding, you can test:

### Academic Features

- Class and stream management
- Subject assignments
- Timetable creation and viewing
- Curriculum management

### Assessment Features

- CA entry and grading
- Exam entry and grading
- Grade calculation
- Report card generation
- Competency tracking

### Attendance Features

- Daily attendance marking
- Attendance reports
- Attendance statistics

### Finance Features

- Fee structure management
- Payment recording
- Fee balance tracking
- Payment reports

### Communication Features

- SMS sending
- Message templates
- Announcement creation
- Guardian communication

### Staff Features

- Staff management
- Teacher alerts
- Staff responsibilities
- Staff tasks
- Subject assignments

### Discipline Features

- Discipline case recording
- Discipline reports

### DoS Features

- Curriculum management
- Timetable creation
- Assessment monitoring
- Teacher assignments

---

## 📝 Important Notes

1. **Idempotent**: The script checks for existing records before creating new ones. Safe to run multiple times.

2. **Performance**: Creating 52,000+ records takes 5-10 minutes. Be patient.

3. **Database**: Ensure your DATABASE_URL in `.env` is correct before running.

4. **Test Data Only**: This is for testing purposes only. Do not use in production.

5. **Cleanup**: To start fresh, delete all records from the database before running again.

---

## 🔍 Verification

After seeding, verify the data:

1. **Login** to the application
2. **Check** all sections have data:
   - Dashboard shows statistics
   - Students page shows 630 students
   - Classes page shows 7 classes
   - Subjects page shows 7 subjects
   - CA page shows entries
   - Exam page shows entries
   - Attendance page shows records
   - Timetable page shows schedules
   - Finance page shows payments
3. **Test** relationships:
   - Click on a student → see their guardian
   - Click on a class → see its students
   - Click on a subject → see assigned teachers
   - Click on a timetable → see entries

---

## 📚 Documentation

For detailed information, see:

- **Quick Summary**: `SEED-DATA-SUMMARY.md`
- **Full Documentation**: `COMPLETE-TEST-DATA-DOCUMENTATION.md`

---

## 🆘 Troubleshooting

### Script fails with "No school found"

**Solution**: Ensure you have a school record in the database. The script looks for the first school.

### Script is slow

**Solution**: This is normal. Creating 52,000+ records takes time. Let it complete.

### Duplicate key errors

**Solution**: Some records already exist. The script will skip them and continue.

### Database connection errors

**Solution**: Check your DATABASE_URL in `.env` and ensure MongoDB is accessible.

---

## 🎉 Success!

After successful seeding, you'll see:

```
✅ COMPLETE school data seeding finished!

📊 FINAL SUMMARY:
  - Classes: 7
  - Streams: 21
  - Subjects: 7
  - Staff: 25
  - Students: 630
  - Guardians: 630
  - CA Entries: 13230
  - Exam Entries: 4410
  - Attendance Records: 31500
  - Timetables: 7
  - Discipline Cases: 63
  - Messages: 189
  - Teacher Alerts: 10
  - Competencies: 49
  - Staff Responsibilities: 7
  - Staff Tasks: 10
  - Payments: 441

🔐 Login Credentials:
  Head Teacher: headteacher@rwenzori.ac.ug / password123
  Deputy: deputy@rwenzori.ac.ug / password123
  DoS: dos@rwenzori.ac.ug / password123
  Bursar: bursar@rwenzori.ac.ug / password123
  Teachers: teacher5@rwenzori.ac.ug to teacher25@rwenzori.ac.ug / password123
```

---

**Your school management system is now fully populated with realistic test data!** 🚀

Test all features, explore the data, and ensure everything works as expected.
