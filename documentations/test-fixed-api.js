const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFixedApiLogic() {
  try {
    console.log('Testing fixed API date validation logic...');
    
    // Get current data
    const academicYear = await prisma.academicYear.findFirst({
      where: { name: '2026 Academic year' },
      include: { terms: true }
    });

    const term1 = academicYear.terms.find(t => t.name === 'Term 1');
    
    console.log('Database dates:');
    console.log(`Academic year: ${academicYear.startDate.toISOString()} to ${academicYear.endDate.toISOString()}`);
    console.log(`Term 1: ${term1.startDate.toISOString()} to ${term1.endDate.toISOString()}`);

    // Simulate frontend input (what causes the error)
    const frontendStartDate = '2026-02-07';
    const frontendEndDate = '2026-05-22';

    console.log('\nFrontend input values:');
    console.log(`Start date: "${frontendStartDate}"`);
    console.log(`End date: "${frontendEndDate}"`);

    // Simulate the FIXED API parsing logic
    let start, end;
    
    if (typeof frontendStartDate === 'string' && frontendStartDate.includes('T')) {
      start = new Date(frontendStartDate);
    } else {
      start = new Date(frontendStartDate + 'T00:00:00.000Z');
    }
    
    if (typeof frontendEndDate === 'string' && frontendEndDate.includes('T')) {
      end = new Date(frontendEndDate);
    } else {
      end = new Date(frontendEndDate + 'T23:59:59.999Z');
    }

    console.log('\nAPI parsed dates:');
    console.log(`Parsed start: ${start.toISOString()}`);
    console.log(`Parsed end: ${end.toISOString()}`);

    // Test the FIXED validation logic (date-only comparison)
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const academicStartDateOnly = new Date(academicYear.startDate.getFullYear(), academicYear.startDate.getMonth(), academicYear.startDate.getDate());
    const academicEndDateOnly = new Date(academicYear.endDate.getFullYear(), academicYear.endDate.getMonth(), academicYear.endDate.getDate());

    console.log('\nFixed validation (date-only comparison):');
    console.log(`Start date only: ${startDateOnly.toISOString()}`);
    console.log(`End date only: ${endDateOnly.toISOString()}`);
    console.log(`Academic start only: ${academicStartDateOnly.toISOString()}`);
    console.log(`Academic end only: ${academicEndDateOnly.toISOString()}`);

    console.log('\nValidation checks:');
    console.log(`startDateOnly < academicStartDateOnly: ${startDateOnly < academicStartDateOnly}`);
    console.log(`endDateOnly > academicEndDateOnly: ${endDateOnly > academicEndDateOnly}`);
    
    const wouldFail = startDateOnly < academicStartDateOnly || endDateOnly > academicEndDateOnly;
    console.log(`Would validation fail? ${wouldFail}`);

    if (wouldFail) {
      console.log('\n❌ VALIDATION WOULD STILL FAIL');
    } else {
      console.log('\n✅ VALIDATION WOULD NOW PASS - ISSUE FIXED!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedApiLogic();