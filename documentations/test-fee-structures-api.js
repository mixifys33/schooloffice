const { prisma } = require('./src/lib/db');

async function testApi() {
  try {
    console.log('Testing fee structures API...');
    
    // Simulate the GET request logic from the API
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: 'test-school-id' // This would normally come from session
      },
      include: {
        class: true,
        term: {
          include: {
            academicYear: true
          }
        }
      },
      orderBy: [
        { class: { name: 'asc' } },
        { term: 'asc' }
      ]
    });

    console.log(`Found ${feeStructures.length} fee structures`);

    // Process each structure to build the breakdown (similar to the API logic)
    const formattedStructures = await Promise.all(feeStructures.map(async (structure) => {
      // Get all fee items for this structure
      const feeItems = await prisma.feeItem.findMany({
        where: { feeStructureId: structure.id }
      });

      // Categorize fee items into the expected breakdown structure
      const breakdown = {
        tuition: 0,
        development: 0,
        meals: 0,
        boarding: 0,
        optional: []
      };

      feeItems.forEach(item => {
        switch (item.category) {
          case 'TUITION':
            breakdown.tuition += item.amount;
            break;
          case 'BOARDING':
            breakdown.boarding += item.amount;
            break;
          case 'MEALS':
            breakdown.meals += item.amount;
            break;
          case 'EXAMINATION': // Using examination as development fee
            breakdown.development += item.amount;
            break;
          default:
            breakdown.optional.push({
              name: item.name,
              amount: item.amount
            });
        }
      });

      return {
        id: structure.id,
        classId: structure.classId,
        className: structure.class?.name || 'Unknown',
        stream: structure.class?.stream || null,
        term: structure.term.name, // Get term name from related term
        academicYear: structure.term.academicYear.name, // Get academic year name from related term
        totalAmount: structure.totalAmount,
        breakdown,
        createdAt: structure.createdAt.toISOString(),
        updatedAt: structure.updatedAt.toISOString()
      };
    }));

    console.log('Formatted structures:', JSON.stringify(formattedStructures, null, 2));
    console.log('API test completed successfully!');
  } catch (error) {
    console.error('Error testing API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApi();