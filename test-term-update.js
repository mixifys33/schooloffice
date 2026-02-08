const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTermUpdate() {
  try {
    console.log('Testing term date validation...');
    
    // Get the current academic year and terms
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        name: '2026 Academic year'
      },
      include: {
        terms: true
      }
    });

    if (!academicYear || !academicYear.terms.length) {
      console.log('No academic year or terms found');
      return;
    }

    const term1 = academicYear.terms.find(t => t.name === 'Term 1');
    if (!term1) {
      console.log('Term 1 not found');
      return;
    }

    console.log(`Academic year range: ${academicYear.startDate.toISOString().split('T')[0]} to ${academicYear.endDate.toISOString().split('T')[0]}`);
    console.log(`Term 1 current dates: ${term1.startDate.toISOString().split('T')[0]} to ${term1.endDate.toISOString().split('T')[0]}`);

    // Test the validation logic that was failing
    const testStartDate = new Date(term1.startDate.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const testEndDate = new Date(term1.endDate.toISOString().split('T')[0] + 'T23:59:59.999Z');

    console.log(`Test dates: ${testStartDate.toISOString()} to ${testEndDate.toISOString()}`);

    // Check if term dates are within academic year dates (this was the failing validation)
    const startWithinRange = testStartDate >= academicYear.startDate;
    const endWithinRange = testEndDate <= academicYear.endDate;

    console.log(`Start date within range: ${startWithinRange}`);
    console.log(`End date within range: ${endWithinRange}`);

    if (startWithinRange && endWithinRange) {
      console.log('✅ Term dates validation would now PASS');
    } else {
      console.log('❌ Term dates validation would still FAIL');
    }

    // Test a small date change (like what the UI would do)
    const newStartDate = new Date(testStartDate);
    newStartDate.setDate(newStartDate.getDate() + 1); // Move start date forward by 1 day

    const newStartWithinRange = newStartDate >= academicYear.startDate;
    const newEndWithinRange = testEndDate <= academicYear.endDate;

    console.log(`\nTesting date change (start date + 1 day):`);
    console.log(`New start date: ${newStartDate.toISOString().split('T')[0]}`);
    console.log(`New start within range: ${newStartWithinRange}`);
    console.log(`End within range: ${newEndWithinRange}`);

    if (newStartWithinRange && newEndWithinRange) {
      console.log('✅ Modified term dates validation would PASS');
    } else {
      console.log('❌ Modified term dates validation would FAIL');
    }

  } catch (error) {
    console.error('Error testing term update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTermUpdate();