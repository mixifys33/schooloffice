const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurriculumData() {
  try {
    console.log('🔍 Checking curriculum data in database...\n');

    // Get school ID (assuming first school)
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('❌ No school found in database');
      return;
    }
    console.log(`✅ School: ${school.name} (ID: ${school.id})\n`);

    // Check CurriculumSubject table
    const curriculumSubjects = await prisma.curriculumSubject.count({
      where: { schoolId: school.id }
    });
    console.log(`📊 CurriculumSubject table: ${curriculumSubjects} records`);

    // Check DoSCurriculumSubject table
    const dosCurriculumSubjects = await prisma.doSCurriculumSubject.count({
      where: { schoolId: school.id }
    });
    console.log(`📊 DoSCurriculumSubject table: ${dosCurriculumSubjects} records`);

    // Check ClassSubject table
    const classSubjects = await prisma.classSubject.count({
      where: { schoolId: school.id }
    });
    console.log(`📊 ClassSubject table: ${classSubjects} records`);

    // Check Classes
    const classes = await prisma.class.count({
      where: { schoolId: school.id }
    });
    console.log(`📊 Classes: ${classes} records`);

    // Check Subjects
    const subjects = await prisma.subject.count({
      where: { schoolId: school.id }
    });
    console.log(`📊 Subjects: ${subjects} records\n`);

    // If DoSCurriculumSubject is empty but ClassSubject has data, suggest migration
    if (dosCurriculumSubjects === 0 && classSubjects > 0) {
      console.log('💡 SUGGESTION: You have data in ClassSubject but not in DoSCurriculumSubject.');
      console.log('   The DoS portal uses DoSCurriculumSubject table.');
      console.log('   You may need to migrate data from ClassSubject to DoSCurriculumSubject.\n');
    }

    // Show sample DoSCurriculumSubject data if exists
    if (dosCurriculumSubjects > 0) {
      console.log('📋 Sample DoSCurriculumSubject records:');
      const samples = await prisma.doSCurriculumSubject.findMany({
        where: { schoolId: school.id },
        include: {
          class: { select: { name: true } },
          subject: { select: { name: true, code: true } }
        },
        take: 5
      });
      samples.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.class.name} - ${s.subject.name} (${s.subject.code}) - Approved: ${s.dosApproved}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurriculumData();
