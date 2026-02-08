const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAcademicYearDates() {
  try {
    console.log('Checking current academic year and term dates...');
    
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        name: '2026 Academic year'
      },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      }
    });

    if (!academicYear) {
      console.log('Academic year not found');
      return;
    }

    console.log(`Current academic year: ${academicYear.startDate.toISOString().split('T')[0]} to ${academicYear.endDate.toISOString().split('T')[0]}`);
    
    // Find the earliest term start date and latest term end date
    const earliestTermStart = academicYear.terms.reduce((earliest, term) => {
      return term.startDate < earliest ? term.startDate : earliest;
    }, academicYear.terms[0]?.startDate || academicYear.startDate);

    const latestTermEnd = academicYear.terms.reduce((latest, term) => {
      return term.endDate > latest ? term.endDate : latest;
    }, academicYear.terms[0]?.endDate || academicYear.endDate);

    console.log(`Earliest term start: ${earliestTermStart.toISOString().split('T')[0]}`);
    console.log(`Latest term end: ${latestTermEnd.toISOString().split('T')[0]}`);

    // Check if academic year needs adjustment
    const needsStartAdjustment = earliestTermStart < academicYear.startDate;
    const needsEndAdjustment = latestTermEnd > academicYear.endDate;

    if (needsStartAdjustment || needsEndAdjustment) {
      console.log('Academic year dates need adjustment to accommodate term dates');
      
      const newStartDate = needsStartAdjustment ? earliestTermStart : academicYear.startDate;
      const newEndDate = needsEndAdjustment ? latestTermEnd : academicYear.endDate;
      
      console.log(`Updating academic year to: ${newStartDate.toISOString().split('T')[0]} to ${newEndDate.toISOString().split('T')[0]}`);
      
      await prisma.academicYear.update({
        where: { id: academicYear.id },
        data: {
          startDate: newStartDate,
          endDate: newEndDate
        }
      });
      
      console.log('✅ Academic year dates updated successfully');
    } else {
      console.log('✅ Academic year dates are already correct');
    }

    // Verify the fix
    const updatedAcademicYear = await prisma.academicYear.findFirst({
      where: { id: academicYear.id },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      }
    });

    console.log('\n--- Verification ---');
    console.log(`Academic year: ${updatedAcademicYear.startDate.toISOString().split('T')[0]} to ${updatedAcademicYear.endDate.toISOString().split('T')[0]}`);
    
    updatedAcademicYear.terms.forEach(term => {
      const startWithinRange = term.startDate >= updatedAcademicYear.startDate;
      const endWithinRange = term.endDate <= updatedAcademicYear.endDate;
      const status = startWithinRange && endWithinRange ? '✅' : '❌';
      
      console.log(`${status} ${term.name}: ${term.startDate.toISOString().split('T')[0]} to ${term.endDate.toISOString().split('T')[0]}`);
    });

  } catch (error) {
    console.error('Error fixing academic year dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAcademicYearDates();