const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      include: {
        terms: true
      },
      orderBy: { startDate: 'desc' }
    });
    
    console.log('Academic Years:');
    academicYears.forEach(year => {
      console.log(`- ${year.name} (${year.startDate.toISOString().split('T')[0]} to ${year.endDate.toISOString().split('T')[0]})`);
      year.terms.forEach(term => {
        console.log(`  - ${term.name}: ${term.startDate.toISOString().split('T')[0]} to ${term.endDate.toISOString().split('T')[0]}`);
      });
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();