const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setCurrentTerm() {
  try {
    const schoolId = '6991bad3be51462507efc102';
    
    // Get the academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: true }
    });
    
    if (!academicYear) {
      console.log('No active academic year found');
      return;
    }
    
    console.log(`Academic Year: ${academicYear.name}`);
    
    // Find which term we're currently in based on today's date
    const today = new Date();
    const currentTerm = academicYear.terms.find(t => 
      new Date(t.startDate) <= today && new Date(t.endDate) >= today
    );
    
    if (currentTerm) {
      console.log(`Current term based on dates: ${currentTerm.name}`);
      
      // Set isCurrent to true for this term
      await prisma.term.updateMany({
        where: { academicYearId: academicYear.id },
        data: { isCurrent: false }
      });
      
      await prisma.term.update({
        where: { id: currentTerm.id },
        data: { isCurrent: true }
      });
      
      console.log(`✓ Set ${currentTerm.name} as current term`);
    } else {
      // If no term matches today's date, use the first term
      const firstTerm = academicYear.terms[0];
      if (firstTerm) {
        await prisma.term.update({
          where: { id: firstTerm.id },
          data: { isCurrent: true }
        });
        console.log(`✓ Set ${firstTerm.name} as current term (default)`);
      }
    }
    
    // Also set the academic year as current
    await prisma.academicYear.updateMany({
      where: { schoolId },
      data: { isCurrent: false }
    });
    
    await prisma.academicYear.update({
      where: { id: academicYear.id },
      data: { isCurrent: true }
    });
    
    console.log(`✓ Set ${academicYear.name} as current academic year`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setCurrentTerm();
