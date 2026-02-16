/**
 * Quick Check: Do grading systems exist?
 * Run: node quick-check-grades.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  try {
    // Get first school
    const school = await prisma.school.findFirst();
    
    if (!school) {
      console.log('❌ No school found');
      await prisma.$disconnect();
      return;
    }

    console.log(`\n📚 School: ${school.name}\n`);

    // Check FINAL grading system
    const finalSystem = await prisma.gradingSystem.findFirst({
      where: {
        schoolId: school.id,
        category: 'FINAL',
        isDefault: true,
      },
      include: {
        grades: { orderBy: { minScore: 'desc' } }
      }
    });

    if (!finalSystem) {
      console.log('❌ NO FINAL GRADING SYSTEM FOUND!');
      console.log('\n📝 Action Required:');
      console.log('   1. Go to: http://localhost:3000/dos/grading');
      console.log('   2. Click "Create New System"');
      console.log('   3. Name: "Primary School Grading" (or any name)');
      console.log('   4. Category: FINAL');
      console.log('   5. Add grade ranges like:');
      console.log('      A  | 80-100 | 4.0 points | Excellent');
      console.log('      B  | 70-79  | 3.0 points | Good');
      console.log('      C  | 60-69  | 2.0 points | Average');
      console.log('      D  | 50-59  | 1.0 points | Pass');
      console.log('      F  | 0-49   | 0.0 points | Fail');
    } else {
      console.log(`✅ FINAL Grading System: "${finalSystem.name}"`);
      console.log(`   Grades defined: ${finalSystem.grades.length}`);
      
      if (finalSystem.grades.length === 0) {
        console.log('\n   ⚠️  No grade ranges! Add grades at:');
        console.log('   http://localhost:3000/dos/grading');
      } else {
        console.log('\n   Grade Ranges:');
        finalSystem.grades.forEach(g => {
          console.log(`   ${g.grade.padEnd(3)} | ${g.minScore}-${g.maxScore}% | ${g.points} pts`);
        });
        console.log('\n   ✅ Grading system is properly configured!');
      }
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
