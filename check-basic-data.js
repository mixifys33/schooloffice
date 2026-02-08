/**
 * Check basic data with simple queries
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBasicData() {
  try {
    console.log('🔍 Checking basic data...\n');

    // Check schools first
    console.log('🏫 Schools:');
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            classes: true,
            subjects: true
          }
        }
      }
    });
    
    console.log(`Found ${schools.length} schools`);
    schools.forEach(school => {
      console.log(`- ${school.name}: ${school._count.classes} classes, ${school._count.subjects} subjects`);
    });

    if (schools.length > 0) {
      const schoolId = schools[0].id;
      console.log(`\n📚 Checking subjects for school: ${schools[0].name}`);
      
      try {
        const subjects = await prisma.subject.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            code: true
          }
        });
        
        console.log(`Found ${subjects.length} subjects:`);
        subjects.forEach(subject => {
          console.log(`- ${subject.name} (${subject.code})`);
        });
      } catch (error) {
        console.log('❌ Error fetching subjects:', error.message);
      }

      console.log(`\n🏫 Checking classes for school: ${schools[0].name}`);
      
      try {
        const classes = await prisma.class.findMany({
          where: { schoolId },
          select: {
            id: true,
            name: true,
            level: true,
            _count: {
              select: {
                students: true,
                classSubjects: true,
                curriculumSubjects: true,
                dosCurriculumSubjects: true
              }
            }
          }
        });
        
        console.log(`Found ${classes.length} classes:`);
        classes.forEach(cls => {
          console.log(`- ${cls.name} (Level ${cls.level}): ${cls._count.students} students, ${cls._count.classSubjects} classSubjects, ${cls._count.curriculumSubjects} curriculumSubjects, ${cls._count.dosCurriculumSubjects} dosCurriculumSubjects`);
        });
      } catch (error) {
        console.log('❌ Error fetching classes:', error.message);
      }

      // Check ClassSubject relationships
      console.log(`\n🔗 Checking ClassSubject relationships for school: ${schools[0].name}`);
      
      try {
        const classSubjects = await prisma.classSubject.findMany({
          where: { schoolId },
          select: {
            id: true,
            class: { select: { name: true } },
            subject: { select: { name: true, code: true } }
          }
        });
        
        console.log(`Found ${classSubjects.length} class-subject relationships:`);
        classSubjects.forEach(cs => {
          console.log(`- ${cs.subject.name} (${cs.subject.code}) → ${cs.class.name}`);
        });
      } catch (error) {
        console.log('❌ Error fetching class subjects:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error checking basic data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBasicData();