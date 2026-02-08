/**
 * Test DoS curriculum data after fixes
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDoSCurriculumData() {
  try {
    console.log('🧪 Testing DoS curriculum data after fixes...\n');

    const schoolId = '695d70b9fd1c15f57d0ad1f2'; // From previous tests

    // Test the DoS curriculum service logic
    console.log('📚 Testing DoS curriculum overview logic:');
    
    // Check DoSCurriculumSubject count
    const dosTotalSubjects = await prisma.doSCurriculumSubject.count({
      where: { schoolId }
    });
    console.log(`DoSCurriculumSubject count: ${dosTotalSubjects}`);

    // If empty, check ClassSubject fallback
    if (dosTotalSubjects === 0) {
      console.log('📚 DoS curriculum empty, testing fallback to ClassSubject data...');
      
      const classSubjects = await prisma.classSubject.findMany({
        where: {
          class: { schoolId }
        },
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { name: true, code: true } }
        }
      });

      console.log(`ClassSubject count: ${classSubjects.length}`);
      
      if (classSubjects.length > 0) {
        console.log('Sample ClassSubject data:');
        classSubjects.slice(0, 5).forEach(cs => {
          console.log(`- ${cs.subject.name} → ${cs.class.name}`);
        });

        // Test classes with subjects
        const classesWithSubjects = await prisma.class.findMany({
          where: { 
            schoolId,
            classSubjects: { some: {} }
          },
          select: { id: true, name: true }
        });

        console.log(`\nClasses with subjects: ${classesWithSubjects.length}`);
        classesWithSubjects.forEach(cls => {
          console.log(`- ${cls.name}`);
        });

        // Calculate metrics like the service would
        const totalSubjects = classSubjects.length;
        const coreSubjectNames = ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics'];
        const coreSubjects = classSubjects.filter(cs => 
          coreSubjectNames.some(core => cs.subject.name.includes(core))
        ).length;

        console.log(`\n📊 Calculated metrics:`);
        console.log(`Total subjects: ${totalSubjects}`);
        console.log(`Core subjects: ${coreSubjects}`);
        console.log(`Classes with subjects: ${classesWithSubjects.length}`);
        console.log(`Average subjects per class: ${classesWithSubjects.length > 0 ? (totalSubjects / classesWithSubjects.length).toFixed(2) : 0}`);
      }
    }

    // Test the updated query for classes (from dashboard API)
    console.log('\n🏫 Testing updated class query:');
    const classes = await prisma.class.findMany({ 
      where: { 
        schoolId,
        OR: [
          {
            dosCurriculumSubjects: {
              some: {}
            }
          },
          {
            classSubjects: {
              some: {}
            }
          }
        ]
      },
      include: {
        _count: {
          select: {
            dosCurriculumSubjects: true,
            classSubjects: true
          }
        }
      }
    });

    console.log(`Classes found: ${classes.length}`);
    classes.forEach(cls => {
      console.log(`- ${cls.name}: DoS=${cls._count.dosCurriculumSubjects}, Regular=${cls._count.classSubjects}`);
    });

  } catch (error) {
    console.error('❌ Error testing DoS curriculum data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDoSCurriculumData();