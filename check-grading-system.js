/**
 * Diagnostic Script: Check Grading System Configuration
 * 
 * Run this to verify your grading system is set up correctly:
 * node check-grading-system.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGradingSystem() {
  try {
    console.log('🔍 Checking Grading System Configuration...\n');

    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    });

    if (schools.length === 0) {
      console.log('❌ No schools found in database');
      return;
    }

    for (const school of schools) {
      console.log(`\n📚 School: ${school.name} (${school.id})`);
      console.log('='.repeat(60));

      // Check for FINAL grading system
      const finalGrading = await prisma.gradingSystem.findFirst({
        where: {
          schoolId: school.id,
          category: 'FINAL',
          isDefault: true,
        },
        include: {
          grades: {
            orderBy: { minScore: 'desc' }
          }
        }
      });

      if (!finalGrading) {
        console.log('❌ No FINAL grading system found');
        console.log('   Action: Create a FINAL grading system at /dashboard/dos/grading');
      } else {
        console.log(`✅ FINAL Grading System: ${finalGrading.name}`);
        console.log(`   ID: ${finalGrading.id}`);
        console.log(`   Grades: ${finalGrading.grades.length} ranges defined\n`);

        if (finalGrading.grades.length === 0) {
          console.log('   ⚠️  No grade ranges defined!');
          console.log('   Action: Add grade ranges (A, B, C, D, F, etc.)');
        } else {
          console.log('   Grade Ranges:');
          finalGrading.grades.forEach(g => {
            console.log(`   ${g.grade.padEnd(3)} | ${g.minScore.toString().padStart(5)}% - ${g.maxScore.toString().padEnd(5)}% | ${g.points} points | ${g.remarks || 'No remarks'}`);
          });

          // Check for gaps in coverage
          const sortedGrades = [...finalGrading.grades].sort((a, b) => a.minScore - b.minScore);
          let hasGaps = false;
          
          if (sortedGrades[0].minScore > 0) {
            console.log(`\n   ⚠️  Gap: 0% - ${sortedGrades[0].minScore - 1}% not covered`);
            hasGaps = true;
          }

          for (let i = 0; i < sortedGrades.length - 1; i++) {
            const current = sortedGrades[i];
            const next = sortedGrades[i + 1];
            if (current.maxScore + 1 < next.minScore) {
              console.log(`   ⚠️  Gap: ${current.maxScore + 1}% - ${next.minScore - 1}% not covered`);
              hasGaps = true;
            }
          }

          if (sortedGrades[sortedGrades.length - 1].maxScore < 100) {
            console.log(`   ⚠️  Gap: ${sortedGrades[sortedGrades.length - 1].maxScore + 1}% - 100% not covered`);
            hasGaps = true;
          }

          if (!hasGaps) {
            console.log('\n   ✅ Full coverage: 0% - 100%');
          }
        }
      }

      // Check for CA_ONLY grading system
      const caGrading = await prisma.gradingSystem.findFirst({
        where: {
          schoolId: school.id,
          category: 'CA_ONLY',
          isDefault: true,
        },
        include: {
          grades: true
        }
      });

      if (caGrading) {
        console.log(`\n✅ CA_ONLY Grading System: ${caGrading.name} (${caGrading.grades.length} grades)`);
      } else {
        console.log('\n⚠️  No CA_ONLY grading system (will fall back to FINAL)');
      }

      // Check for EXAM_ONLY grading system
      const examGrading = await prisma.gradingSystem.findFirst({
        where: {
          schoolId: school.id,
          category: 'EXAM_ONLY',
          isDefault: true,
        },
        include: {
          grades: true
        }
      });

      if (examGrading) {
        console.log(`✅ EXAM_ONLY Grading System: ${examGrading.name} (${examGrading.grades.length} grades)`);
      } else {
        console.log('⚠️  No EXAM_ONLY grading system (will fall back to FINAL)');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGradingSystem();
