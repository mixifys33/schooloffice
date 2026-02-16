const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteValleySchoolData() {
  try {
    console.log('🔍 Looking for school with code "VALLEY"...');

    // Find the school
    const school = await prisma.school.findFirst({
      where: {
        code: 'VALLEY'
      }
    });

    if (!school) {
      console.log('❌ School with code "VALLEY" not found');
      return;
    }

    console.log(`✅ Found school: ${school.name} (ID: ${school.id})`);
    console.log('⚠️  This will delete ALL data for this school!');
    console.log('');

    const schoolId = school.id;

    // Delete in correct order (respecting foreign key constraints)
    console.log('🗑️  Starting deletion process...');
    console.log('');

    // 1. Delete timetable entries first
    const timetableEntries = await prisma.doSTimetableEntry.deleteMany({
      where: { timetable: { schoolId } }
    });
    console.log(`✅ Deleted ${timetableEntries.count} timetable entries`);

    // 2. Delete timetables
    const timetables = await prisma.doSTimetable.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${timetables.count} timetables`);

    // 3. Delete curriculum subjects
    const curriculumSubjects = await prisma.doSCurriculumSubject.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${curriculumSubjects.count} curriculum subjects`);

    // 4. Delete grading system grades
    const grades = await prisma.gradeRange.deleteMany({
      where: { gradingSystem: { schoolId } }
    });
    console.log(`✅ Deleted ${grades.count} grade ranges`);

    // 5. Delete grading systems
    const gradingSystems = await prisma.gradingSystem.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${gradingSystems.count} grading systems`);

    // 6. Delete CA entries
    const caEntries = await prisma.cAEntry.deleteMany({
      where: { subject: { schoolId } }
    });
    console.log(`✅ Deleted ${caEntries.count} CA entries`);

    // 7. Delete exam entries
    const examEntries = await prisma.examEntry.deleteMany({
      where: { subject: { schoolId } }
    });
    console.log(`✅ Deleted ${examEntries.count} exam entries`);

    // 8. Delete staff subject assignments
    const staffSubjects = await prisma.staffSubject.deleteMany({
      where: { staff: { schoolId } }
    });
    console.log(`✅ Deleted ${staffSubjects.count} staff subject assignments`);

    // 9. Delete class subjects
    const classSubjects = await prisma.classSubject.deleteMany({
      where: { class: { schoolId } }
    });
    console.log(`✅ Deleted ${classSubjects.count} class subjects`);

    // 10. Delete student accounts first
    const studentAccounts = await prisma.studentAccount.deleteMany({
      where: { student: { schoolId } }
    });
    console.log(`✅ Deleted ${studentAccounts.count} student accounts`);

    // 11. Delete students
    const students = await prisma.student.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${students.count} students`);

    // 12. Delete payments
    const payments = await prisma.payment.deleteMany({
      where: { student: { schoolId } }
    });
    console.log(`✅ Deleted ${payments.count} payments`);

    // 13. Delete staff
    const staff = await prisma.staff.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${staff.count} staff members`);

    // 14. Delete subjects
    const subjects = await prisma.subject.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${subjects.count} subjects`);

    // 15. Delete classes
    const classes = await prisma.class.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${classes.count} classes`);

    // 16. Delete terms
    const terms = await prisma.term.deleteMany({
      where: { academicYear: { schoolId } }
    });
    console.log(`✅ Deleted ${terms.count} terms`);

    // 17. Delete academic years
    const academicYears = await prisma.academicYear.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${academicYears.count} academic years`);

    // 18. Delete audit logs for users in this school
    const auditLogs = await prisma.auditLog.deleteMany({
      where: { user: { schoolId } }
    });
    console.log(`✅ Deleted ${auditLogs.count} audit logs`);

    // 19. Delete users associated with this school
    const users = await prisma.user.deleteMany({
      where: { schoolId }
    });
    console.log(`✅ Deleted ${users.count} users`);

    // 20. Finally, delete the school itself
    await prisma.school.delete({
      where: { id: schoolId }
    });
    console.log(`✅ Deleted school: ${school.name}`);

    console.log('');
    console.log('✅ ✅ ✅ ALL DATA FOR SCHOOL "VALLEY" HAS BEEN DELETED ✅ ✅ ✅');

  } catch (error) {
    console.error('❌ Error deleting school data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteValleySchoolData();
