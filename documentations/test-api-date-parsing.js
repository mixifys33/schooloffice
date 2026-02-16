const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApiDateParsing() {
  try {
    console.log('Testing API date parsing logic...');
    
    // Get current data
    const academicYear = await prisma.academicYear.findFirst({
      where: { name: '2026 Academic year' },
      include: { terms: true }
    });

    const term1 = academicYear.terms.find(t => t.name === 'Term 1');
    
    console.log('Database dates:');
    console.log(`Academic year: ${academicYear.startDate.toISOString()} to ${academicYear.endDate.toISOString()}`);
    console.log(`Term 1: ${term1.startDate.toISOString()} to ${term1.endDate.toISOString()}`);

    // Simulate what the frontend sends (date string from input field)
    const frontendStartDate = '2026-02-07'; // This is what the date input sends
    const frontendEndDate = '2026-05-22';

    console.log('\nFrontend input values:');
    console.log(`Start date: "${frontendStartDate}"`);
    console.log(`End date: "${frontendEndDate}"`);

    // Simulate the API parsing logic (from the PUT route)
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

    // Test the validation that's failing
    console.log('\nValidation checks:');
    console.log(`start < academicYear.startDate: ${start < academicYear.startDate}`);
    console.log(`end > academicYear.endDate: ${end > academicYear.endDate}`);
    
    const wouldFail = start < academicYear.startDate || end > academicYear.endDate;
    console.log(`Would validation fail? ${wouldFail}`);

    if (wouldFail) {
      console.log('\n❌ VALIDATION WOULD FAIL');
      console.log('Reason:');
      if (start < academicYear.startDate) {
        console.log(`- Start date ${start.toISOString()} is before academic year start ${academicYear.startDate.toISOString()}`);
      }
      if (end > academicYear.endDate) {
        console.log(`- End date ${end.toISOString()} is after academic year end ${academicYear.endDate.toISOString()}`);
      }
    } else {
      console.log('\n✅ VALIDATION WOULD PASS');
    }

    // Test alternative parsing approach
    console.log('\n--- Testing alternative parsing ---');
    
    // Parse dates to match database timezone
    const altStart = new Date(frontendStartDate + 'T19:56:00.211Z'); // Match DB timezone
    const altEnd = new Date(frontendEndDate + 'T00:00:00.000Z');

    console.log(`Alternative start: ${altStart.toISOString()}`);
    console.log(`Alternative end: ${altEnd.toISOString()}`);

    const altWouldFail = altStart < academicYear.startDate || altEnd > academicYear.endDate;
    console.log(`Alternative validation would fail? ${altWouldFail}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiDateParsing();