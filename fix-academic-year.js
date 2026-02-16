/**
 * Fix Academic Year and Term - Set current flags
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAcademicYear() {
  try {
    console.log('🔧 Checking academic years and terms...\n');
    
    // Get the school
    const school = await prisma.school.findFirst({
      where: { code: 'VALLEY' }
    });

    if (!school) {
      console.log('❌ School not found');
      return;
    }

    console.log('✅ School:', school.name);
    console.log('   School ID:', school.id);

    // Get all academic years for this school
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: school.id },
      orderBy: { startDate: 'desc' },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      }
    });

    console.log('\n📅 Academic Years found:', academicYears.length);

    if (academicYears.length === 0) {
      console.log('\n❌ No academic years found!');
      console.log('   You need to create an academic year first.');
      console.log('   Go to: School Admin > Academic Calendar > Create Academic Year');
      return;
    }

    // Show all academic years
    academicYears.forEach((year, index) => {
      console.log(`\n${index + 1}. ${year.name}`);
      console.log(`   ID: ${year.id}`);
      console.log(`   Start: ${year.startDate.toISOString().split('T')[0]}`);
      console.log(`   End: ${year.endDate.toISOString().split('T')[0]}`);
      console.log(`   isCurrent: ${year.isCurrent}`);
      console.log(`   Terms: ${year.terms.length}`);
      
      year.terms.forEach((term, tIndex) => {
        console.log(`      ${tIndex + 1}. ${term.name} (isCurrent: ${term.isCurrent})`);
      });
    });

    // Find the most recent academic year
    const currentYear = academicYears[0];
    
    console.log('\n🔧 Setting current academic year...');
    
    // Clear all isCurrent flags first
    await prisma.academicYear.updateMany({
      where: { schoolId: school.id },
      data: { isCurrent: false }
    });

    // Set the most recent year as current
    await prisma.academicYear.update({
      where: { id: currentYear.id },
      data: { isCurrent: true }
    });

    console.log('✅ Set as current:', currentYear.name);

    // Set current term
    if (currentYear.terms.length > 0) {
      console.log('\n🔧 Setting current term...');
      
      // Clear all isCurrent flags for terms in this year
      await prisma.term.updateMany({
        where: { academicYearId: currentYear.id },
        data: { isCurrent: false }
      });

      // Find the term that contains today's date
      const today = new Date();
      const currentTerm = currentYear.terms.find(term => 
        term.startDate <= today && term.endDate >= today
      );

      if (currentTerm) {
        await prisma.term.update({
          where: { id: currentTerm.id },
          data: { isCurrent: true }
        });
        console.log('✅ Set as current term:', currentTerm.name);
      } else {
        // If no term contains today, set the first term as current
        await prisma.term.update({
          where: { id: currentYear.terms[0].id },
          data: { isCurrent: true }
        });
        console.log('✅ Set as current term (default):', currentYear.terms[0].name);
      }
    } else {
      console.log('\n⚠️  No terms found for this academic year!');
      console.log('   You need to create terms for this academic year.');
      console.log('   Go to: School Admin > Academic Calendar > Create Terms');
    }

    console.log('\n✅ Academic year and term setup complete!');
    console.log('\n📋 Summary:');
    console.log('   Current Academic Year:', currentYear.name);
    console.log('   Current Term:', currentYear.terms.find(t => t.isCurrent)?.name || 'None');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAcademicYear();
