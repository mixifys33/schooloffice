const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAcademicData() {
  try {
    console.log('Checking academic years and terms in database...\n');
    
    // Get all academic years with their terms
    const academicYears = await prisma.academicYear.findMany({
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    console.log(`Found ${academicYears.length} academic year(s):\n`);

    academicYears.forEach((year, index) => {
      console.log(`${index + 1}. Academic Year: ${year.name}`);
      console.log(`   ID: ${year.id}`);
      console.log(`   Start Date: ${year.startDate.toISOString().split('T')[0]}`);
      console.log(`   End Date: ${year.endDate.toISOString().split('T')[0]}`);
      console.log(`   Is Active: ${year.isActive}`);
      console.log(`   School ID: ${year.schoolId}`);
      console.log(`   Terms: ${year.terms.length}`);
      
      if (year.terms.leng