/**
 * Check curriculum data in both models to understand the migration needed
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurriculumData() {
  try {
    console.log('🔍 Checking curriculum data in both models...\n');

    // Check legacy CurriculumSubject model
    console.log('📚 Legacy CurriculumSubject data:');
    const legacyCurriculum = await prisma.curriculumSubject.findMany({
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } }
      }
    });
    
    console.log(`Found ${legacyCurriculum.length} legacy curriculum subjects`);
    if (legacyCurriculum.length > 0) {
      console.log('Sample legacy data:');
      legacyCurriculum.slice(0, 3).forEach(item => {
        console.log(`- ${item.subject.name} for ${item.class.name} (School: ${item.school.name})`);
        console.log(`  DoS Approved: ${item.dosApproved}, Core: ${item.isCore}`);
      });
    }

    console.log('\n🆕 New DoSCurriculumSubject data:');
    const newCurriculum = await prisma.doSCurriculumSubject.findMany({
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } }
      }
    });
    
    console.log(`Found ${newCurriculum.length} new DoS curriculum subjects`);
    if (newCurriculum.length > 0) {
      console.log('Sample new data:');
      newCurriculum.slice(0, 3).forEach(item => {
        console.log(`- ${item.subjectName} for ${item.class.name} (School: ${item.school.name})`);
        console.log(`  DoS Approved: ${item.dosApproved}, Core: ${item.isCore}`);
      });
    }

    // Check schools and classes
    console.log('\n🏫 Schools and Classes:');
    const schools = await prisma.school.findMany({
      include: {
        classes: {
          include: {
            _count: {
              select: {
                curriculumSubjects: true,
                dosCurriculumSubjects: true
              }
            }
          }
        }
      }
    });

    schools.forEach(school => {
      console.log(`\nSchool: ${school.name} (${school.classes.length} classes)`);
      school.classes.forEach(cls => {
        console.log(`  Class: ${cls.name} - Legacy: ${cls._count.curriculumSubjects}, New: ${cls._count.dosCurriculumSubjects} subjects`);
      });
    });

  } catch (error) {
    console.error('❌ Error checking curriculum data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurriculumData();