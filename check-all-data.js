const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllData() {
  try {
    console.log('🔍 Checking all data in database...\n');

    // Check all collections
    const schools = await prisma.school.count();
    const users = await prisma.user.count();
    const staff = await prisma.staff.count();
    const students = await prisma.student.count();
    const classes = await prisma.class.count();
    const subjects = await prisma.subject.count();
    const academicYears = await prisma.academicYear.count();
    const terms = await prisma.term.count();
    const caEntries = await prisma.cAEntry.count();
    const examEntries = await prisma.examEntry.count();
    const gradingSystems = await prisma.gradingSystem.count();
    const gradeRanges = await prisma.gradeRange.count();
    const timetables = await prisma.doSTimetable.count();
    const timetableEntries = await prisma.doSTimetableEntry.count();
    const curriculumSubjects = await prisma.doSCurriculumSubject.count();
    const classSubjects = await prisma.classSubject.count();
    const staffSubjects = await prisma.staffSubject.count();
    const studentAccounts = await prisma.studentAccount.count();
    const payments = await prisma.payment.count();
    const auditLogs = await prisma.auditLog.count();

    console.log('📊 Database Summary:');
    console.log('='.repeat(50));
    console.log(`Schools:              ${schools}`);
    console.log(`Users:                ${users}`);
    console.log(`Staff:                ${staff}`);
    console.log(`Students:             ${students}`);
    console.log(`Classes:              ${classes}`);
    console.log(`Subjects:             ${subjects}`);
    console.log(`Academic Years:       ${academicYears}`);
    console.log(`Terms:                ${terms}`);
    console.log(`CA Entries:           ${caEntries}`);
    console.log(`Exam Entries:         ${examEntries}`);
    console.log(`Grading Systems:      ${gradingSystems}`);
    console.log(`Grade Ranges:         ${gradeRanges}`);
    console.log(`Timetables:           ${timetables}`);
    console.log(`Timetable Entries:    ${timetableEntries}`);
    console.log(`Curriculum Subjects:  ${curriculumSubjects}`);
    console.log(`Class Subjects:       ${classSubjects}`);
    console.log(`Staff Subjects:       ${staffSubjects}`);
    console.log(`Student Accounts:     ${studentAccounts}`);
    console.log(`Payments:             ${payments}`);
    console.log(`Audit Logs:           ${auditLogs}`);
    console.log('='.repeat(50));

    const total = schools + users + staff + students + classes + subjects + 
                  academicYears + terms + caEntries + examEntries + gradingSystems + 
                  gradeRanges + timetables + timetableEntries + curriculumSubjects + 
                  classSubjects + staffSubjects + studentAccounts + payments + auditLogs;

    console.log(`\n📈 Total Records: ${total}\n`);

    if (total === 0) {
      console.log('✅ Database is completely empty!');
    } else {
      console.log('⚠️  Database still contains data.');
      
      // Show schools if any
      if (schools > 0) {
        console.log('\n🏫 Schools in database:');
        const schoolList = await prisma.school.findMany({
          select: { id: true, name: true, code: true }
        });
        schoolList.forEach(school => {
          console.log(`   - ${school.name} (${school.code}) - ID: ${school.id}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData();
