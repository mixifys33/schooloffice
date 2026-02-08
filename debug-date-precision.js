const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDatePrecision() {
  try {
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        name: '2026 Academic year'
      },
      include: {
        terms: true
      }
    });

    const term1 = academicYear.terms.find(t => t.name === 'Term 1');

    console.log('Exact timestamps:');
    console.log(`Academic year start: ${academicYear.startDate.toISOString()}`);
    console.log(`Academic year end: ${academicYear.endDate.toISOString()}`);
    console.log(`Term 1 start: ${term1.startDate.toISOString()}`);
    console.log(`Term 1 end: ${term1.endDate.toISOString()}`);

    console.log('\nComparison results:');
    console.log(`term1.startDate >= academicYear.startDate: ${term1.startDate >= academicYear.startDate}`);
    console.log(`term1.endDate <= academicYear.endDate: ${term1.endDate <= academicYear.endDate}`);

    console.log('\nTime values:');
    console.log(`Academic year start time: ${academicYear.startDate.getTime()}`);
    console.log(`Term 1 start time: ${term1.startDate.getTime()}`);
    console.log(`Difference: ${term1.startDate.getTime() - academicYear.startDate.getTime()} ms`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatePrecision();