/**
 * Check subjects, classes, and their relationships
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubjectsAndClasses() {
  try {
    console.log('🔍 Checking subjects and classes data...\n');

    // Check subjects
    console.log('📖 Subjects in system:');
    const subjects = await prisma.subject.findMany({
      include: {
        school: { select: { name: true } }
      }
    });
    
    console.log(`Found ${subjects.length} subjects`);
    subjects.forEach(subject => {
      console.log(`- ${subject.name} (${subject.code}) - School: ${subject.school.name}`);
    });

    // Check classes
    console.log('\n🏫 Classes in system:');
    const classes = await prisma.class.findMany({
      include: {
        school: { select: { name: true } },
        students: { select: { id: true } },
        classSubjects: {
          include: {
            subject: { select: { name: true, code: true } }
          }
        }
      }
    });
    
    console.log(`Found ${classes.length} classes`);
    classes.forEach(cls => {
      console.log(`\nClass: ${cls.name} (Level ${cls.level}) - School: ${cls.school.name}`);
      console.log(`  Students: ${cls.students.length}`);
      console.log(`  ClassSubjects: ${cls.classSubjects.length}`);
      if (cls.classSubjects.length > 0) {
        cls.classSubjects.forEach(cs => {
          console.log(`    - ${cs.subject.name} (${cs.subject.code})`);
        });
      }
    });

    // Check ClassSubject model
    console.log('\n📚 ClassSubject relationships:');
    const classSubjects = await prisma.classSubject.findMany({
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } },
        school: { select: { name: true } }
      }
    });
    
    console.log(`Found ${classSubjects.length} class-subject relationships`);
    classSubjects.forEach(cs => {
      console.log(`- ${cs.subject.name} assigned to ${cs.class.name} (School: ${cs.school.name})`);
    });

    // Check if there are any other subject-related models
    console.log('\n🔗 Other subject relationships:');
    
    const staffSubjects = await prisma.staffSubject.findMany({
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        staff: { select: { firstName: true, lastName: true } }
      }
    });
    console.log(`StaffSubject assignments: ${staffSubjects.length}`);
    
    staffSubjects.slice(0, 5).forEach(ss => {
      console.log(`- ${ss.staff.firstName} ${ss.staff.lastName} teaches ${ss.subject.name} to ${ss.class.name}`);
    });

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubjectsAndClasses();