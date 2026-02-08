/**
 * Simple fix for curriculum assignments - just create ClassSubject relationships first
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Typical Ugandan secondary school subject assignments by level
const UGANDAN_CURRICULUM = {
  1: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Geography', 'History', 'Religious Education (CRE)', 'Physical Education'],
  2: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Geography', 'History', 'Religious Education (CRE)', 'Physical Education', 'Kiswahili'],
  3: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Geography', 'History', 'Economics', 'Literature in English', 'Religious Education (CRE)'],
  4: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Geography', 'History', 'Economics', 'Literature in English', 'Religious Education (CRE)'],
  5: ['Mathematics', 'Chemistry', 'Biology', 'English Language', 'Economics'],
  6: ['Mathematics', 'Chemistry', 'Biology', 'English Language', 'Economics'],
  11: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Geography', 'History', 'Economics', 'Literature in English']
};

async function fixCurriculumSimple() {
  try {
    console.log('🔧 Creating basic curriculum assignments...\n');

    // Get school data
    const school = await prisma.school.findFirst({
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        subjects: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!school) {
      console.log('❌ No school found');
      return;
    }

    console.log(`🏫 Working with school: ${school.name}`);

    // Create a map of subject names to IDs for easy lookup
    const subjectMap = new Map();
    school.subjects.forEach(subject => {
      subjectMap.set(subject.name, subject.id);
    });

    let totalAssignments = 0;

    // Process each class - only create ClassSubject relationships
    for (const classItem of school.classes) {
      console.log(`\n📖 Processing class: ${classItem.name} (Level ${classItem.level})`);
      
      const curriculumSubjects = UGANDAN_CURRICULUM[classItem.level] || [];
      console.log(`  Expected subjects: ${curriculumSubjects.length}`);

      let classAssignments = 0;

      for (const subjectName of curriculumSubjects) {
        const subjectId = subjectMap.get(subjectName);
        
        if (subjectId) {
          try {
            // Create ClassSubject relationship (if not exists)
            const existingClassSubject = await prisma.classSubject.findFirst({
              where: {
                classId: classItem.id,
                subjectId: subjectId
              }
            });

            if (!existingClassSubject) {
              await prisma.classSubject.create({
                data: {
                  classId: classItem.id,
                  subjectId: subjectId,
                  maxMark: 100,
                  appearsOnReport: true,
                  affectsPosition: true
                }
              });
              classAssignments++;
              totalAssignments++;
              console.log(`    ✅ Assigned: ${subjectName}`);
            } else {
              console.log(`    ⏭️  Already assigned: ${subjectName}`);
            }

          } catch (error) {
            console.log(`    ❌ Error assigning ${subjectName}: ${error.message}`);
          }
        } else {
          console.log(`    ⚠️  Subject not found: ${subjectName}`);
        }
      }

      console.log(`  📊 Class summary: ${classAssignments} new assignments`);
    }

    console.log(`\n🎉 Basic assignment complete!`);
    console.log(`📊 Total new ClassSubject assignments: ${totalAssignments}`);

    // Verify the results
    console.log('\n🔍 Verification:');
    const classSubjectCount = await prisma.classSubject.count();
    console.log(`📚 Total ClassSubject relationships: ${classSubjectCount}`);

    // Show class-subject breakdown
    console.log('\n📊 Class-Subject breakdown:');
    for (const classItem of school.classes) {
      const count = await prisma.classSubject.count({
        where: { classId: classItem.id }
      });
      console.log(`  ${classItem.name}: ${count} subjects`);
    }

  } catch (error) {
    console.error('❌ Error fixing curriculum assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCurriculumSimple();