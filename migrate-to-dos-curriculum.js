const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateToDo SCurriculum() {
  try {
    console.log('🚀 Starting migration from ClassSubject to DoSCurriculumSubject...\n');

    // Get school
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('❌ No school found');
      return;
    }

    // Get all ClassSubject records
    const classSubjects = await prisma.classSubject.findMany({
      where: { schoolId: school.id },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } }
      }
    });

    console.log(`📊 Found ${classSubjects.length} ClassSubject records to migrate\n`);

    let migrated = 0;
    let skipped = 0;

    for (const cs of classSubjects) {
      try {
        // Check if already exists in DoSCurriculumSubject
        const existing = await prisma.doSCurriculumSubject.findFirst({
          where: {
            schoolId: cs.schoolId,
            classId: cs.classId,
            subjectId: cs.subjectId
          }
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${cs.class.name} - ${cs.subject.name} (already exists)`);
          skipped++;
          continue;
        }

        // Create in DoSCurriculumSubject
        await prisma.doSCurriculumSubject.create({
          data: {
            schoolId: cs.schoolId,
            classId: cs.classId,
            subjectId: cs.subjectId,
            isCore: true, // Assume all are core for now
            caWeight: 40, // Default CA weight
            examWeight: 60, // Default Exam weight
            minPassMark: 50, // Default pass mark
            periodsPerWeek: 4, // Default periods
            dosApproved: false, // Needs DoS approval
            isActive: true
          }
        });

        console.log(`✅ Migrated: ${cs.class.name} - ${cs.subject.name} (${cs.subject.code})`);
        migrated++;
      } catch (error) {
        console.log(`❌ Error migrating ${cs.class.name} - ${cs.subject.name}: ${error.message}`);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated} records`);
    console.log(`   ⏭️  Skipped: ${skipped} records`);
    console.log(`   ❌ Failed: ${classSubjects.length - migrated - skipped} records\n`);

    // Verify
    const dosCurriculumCount = await prisma.doSCurriculumSubject.count({
      where: { schoolId: school.id }
    });
    console.log(`✅ DoSCurriculumSubject now has ${dosCurriculumCount} records\n`);

    console.log('🎉 Migration complete! Refresh your DoS Curriculum page to see the data.');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToDo SCurriculum();
