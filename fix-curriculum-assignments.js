/**
 * Fix curriculum assignments by creating proper subject-class relationships
 * This will populate the DoS curriculum data based on typical Ugandan school structure
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Typical Ugandan secondary school subject assignments by level
const UGANDAN_CURRICULUM = {
  // S1 (Level 1) - Foundation subjects
  1: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Religious Education (CRE)', 'Physical Education'],
  
  // S2 (Level 2) - Continued foundation
  2: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Religious Education (CRE)', 'Physical Education', 'Kiswahili'],
  
  // S3 (Level 3) - Pre-specialization
  3: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Economics', 'Literature in English', 'Religious Education (CRE)'],
  
  // S4 (Level 4) - O-Level completion
  4: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Economics', 'Literature in English', 'Religious Education (CRE)'],
  
  // S5 (Level 5) - A-Level start (Science combination example)
  5: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Language'],
  
  // S6 (Level 6) - A-Level completion
  6: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Language'],
  
  // Level 11 classes (seems to be duplicates, will use S3 curriculum)
  11: ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Economics', 'Literature in English']
};

async function fixCurriculumAssignments() {
  try {
    console.log('🔧 Fixing curriculum assignments...\n');

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
    console.log(`📚 Available subjects: ${school.subjects.length}`);
    console.log(`🏫 Classes: ${school.classes.length}`);

    // Create a map of subject names to IDs for easy lookup
    const subjectMap = new Map();
    school.subjects.forEach(subject => {
      subjectMap.set(subject.name, subject.id);
    });

    let totalAssignments = 0;
    let totalDoSCurriculum = 0;

    // Process each class
    for (const classItem of school.classes) {
      console.log(`\n📖 Processing class: ${classItem.name} (Level ${classItem.level})`);
      
      const curriculumSubjects = UGANDAN_CURRICULUM[classItem.level] || [];
      console.log(`  Expected subjects: ${curriculumSubjects.length}`);

      let classAssignments = 0;
      let classDoSCurriculum = 0;

      for (const subjectName of curriculumSubjects) {
        const subjectId = subjectMap.get(subjectName);
        
        if (subjectId) {
          try {
            // 1. Create ClassSubject relationship (if not exists)
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
              console.log(`    ✅ Assigned: ${subjectName}`);
            } else {
              console.log(`    ⏭️  Already assigned: ${subjectName}`);
            }

            // 2. Create DoSCurriculumSubject (if not exists)
            const existingDoSCurriculum = await prisma.doSCurriculumSubject.findFirst({
              where: {
                schoolId: school.id,
                classId: classItem.id,
                subjectId: subjectId
              }
            });

            if (!existingDoSCurriculum) {
              // Determine if it's a core subject (Math, English, Sciences for lower levels)
              const isCore = ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics'].includes(subjectName);
              
              const subject = school.subjects.find(s => s.id === subjectId);
              
              await prisma.doSCurriculumSubject.create({
                data: {
                  schoolId: school.id,
                  classId: classItem.id,
                  subjectId: subjectId,
                  subjectName: subject.name,
                  subjectCode: subject.code,
                  isCore: isCore,
                  caWeight: 20.0,
                  examWeight: 80.0,
                  minPassMark: 50.0,
                  periodsPerWeek: isCore ? 5 : 3,
                  practicalPeriods: ['Biology', 'Chemistry', 'Physics'].includes(subjectName) ? 2 : 0,
                  dosApproved: true, // Auto-approve for initial setup
                  dosApprovedAt: new Date(),
                  createdBy: 'system' // System migration
                }
              });
              classDoSCurriculum++;
              console.log(`    ✅ DoS Curriculum: ${subjectName} (Core: ${isCore})`);
            } else {
              console.log(`    ⏭️  DoS Curriculum exists: ${subjectName}`);
            }

          } catch (error) {
            console.log(`    ❌ Error assigning ${subjectName}: ${error.message}`);
          }
        } else {
          console.log(`    ⚠️  Subject not found: ${subjectName}`);
        }
      }

      console.log(`  📊 Class summary: ${classAssignments} new assignments, ${classDoSCurriculum} new DoS curriculum entries`);
      totalAssignments += classAssignments;
      totalDoSCurriculum += classDoSCurriculum;
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`📊 Total new ClassSubject assignments: ${totalAssignments}`);
    console.log(`📊 Total new DoSCurriculumSubject entries: ${totalDoSCurriculum}`);

    // Verify the results
    console.log('\n🔍 Verification:');
    const classSubjectCount = await prisma.classSubject.count();
    const dosCurriculumCount = await prisma.doSCurriculumSubject.count();
    
    console.log(`📚 Total ClassSubject relationships: ${classSubjectCount}`);
    console.log(`📚 Total DoSCurriculumSubject entries: ${dosCurriculumCount}`);

  } catch (error) {
    console.error('❌ Error fixing curriculum assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCurriculumAssignments();