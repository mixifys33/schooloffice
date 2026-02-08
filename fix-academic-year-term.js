/**
 * Script to fix the academic year and term issue by creating an academic year
 * that covers the current date (February 6, 2026)
 */
require('dotenv').config();

async function fixAcademicYearAndTerm() {
  try {
    // Import Prisma Client
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log('Fixing academic year and term issue...');

    // Get the first school in the database to associate with the academic year
    const schools = await prisma.school.findMany({
      take: 1,
      select: {
        id: true,
        name: true
      }
    });

    if (schools.length === 0) {
      console.error('No schools found in the database. Cannot create academic year.');
      await prisma.$disconnect();
      return;
    }

    const school = schools[0];
    console.log(`Using school: ${school.name} (ID: ${school.id})`);

    // Check if there's already an academic year that covers the current date (2026)
    const currentDate = new Date(); // February 6, 2026
    const currentYear = currentDate.getFullYear();
    const nextYear = currentYear + 1;

    // Check if an academic year for the current year range already exists
    const existingAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: school.id,
        name: `${currentYear}/${nextYear}`
      }
    });

    if (existingAcademicYear) {
      console.log(`Academic year ${currentYear}/${nextYear} already exists.`);
      
      // Check if any terms in this academic year are active for the current date
      const existingTerms = await prisma.term.findMany({
        where: {
          academicYearId: existingAcademicYear.id
        }
      });

      let hasCurrentTerm = false;
      for (const term of existingTerms) {
        if (term.startDate <= currentDate && term.endDate >= currentDate) {
          hasCurrentTerm = true;
          console.log(`Found active term: ${term.name} (${term.startDate} to ${term.endDate})`);
          break;
        }
      }

      if (hasCurrentTerm) {
        console.log('There is already an active term for the current date.');
        await prisma.$disconnect();
        return;
      } else {
        console.log('No active term found for current date in existing academic year.');
      }
    }

    // If no academic year exists for the current year or no active term, create them
    if (!existingAcademicYear) {
      console.log(`Creating academic year ${currentYear}/${nextYear}...`);
      
      // Define dates for the academic year covering 2026
      // Starting from January 1, 2026 to December 31, 2026
      const academicYearStartDate = new Date(`${currentYear}-01-01T00:00:00Z`);
      const academicYearEndDate = new Date(`${currentYear}-12-31T23:59:59Z`);

      const academicYear = await prisma.academicYear.create({
        data: {
          schoolId: school.id,
          name: `${currentYear}/${nextYear}`,
          startDate: academicYearStartDate,
          endDate: academicYearEndDate,
          isActive: true // Set this as the active academic year
        }
      });

      console.log(`Created academic year: ${academicYear.name} (ID: ${academicYear.id})`);
    } else {
      // Update the existing academic year to be active
      await prisma.academicYear.update({
        where: { id: existingAcademicYear.id },
        data: { isActive: true }
      });
      console.log(`Updated academic year ${existingAcademicYear.name} to be active.`);
    }

    // Get the academic year (either existing or newly created)
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: school.id,
        name: `${currentYear}/${nextYear}`
      }
    });

    if (!academicYear) {
      console.error('Could not find the academic year after creation/update.');
      await prisma.$disconnect();
      return;
    }

    // Create terms for the academic year if none exist
    const existingTerms = await prisma.term.findMany({
      where: {
        academicYearId: academicYear.id
      }
    });

    if (existingTerms.length === 0) {
      console.log('Creating terms for the academic year...');

      // Create three terms for the academic year
      const termsData = [
        {
          name: 'First Term',
          startDate: new Date(`${currentYear}-01-01T00:00:00Z`), // January 1
          endDate: new Date(`${currentYear}-04-30T23:59:59Z`)   // April 30
        },
        {
          name: 'Second Term',
          startDate: new Date(`${currentYear}-05-01T00:00:00Z`), // May 1
          endDate: new Date(`${currentYear}-08-31T23:59:59Z`)   // August 31
        },
        {
          name: 'Third Term',
          startDate: new Date(`${currentYear}-09-01T00:00:00Z`), // September 1
          endDate: new Date(`${currentYear}-12-31T23:59:59Z`)   // December 31
        }
      ];

      // Since today is February 6, 2026, the first term should be active
      for (const termData of termsData) {
        const term = await prisma.term.create({
          data: {
            academicYearId: academicYear.id,
            name: termData.name,
            startDate: termData.startDate,
            endDate: termData.endDate
          }
        });
        console.log(`Created term: ${term.name} (${termData.startDate} to ${termData.endDate})`);
      }
    } else {
      console.log(`Found ${existingTerms.length} existing terms for the academic year.`);
      
      // Check if any of the existing terms is active for the current date
      let activeTermExists = false;
      for (const term of existingTerms) {
        if (term.startDate <= currentDate && term.endDate >= currentDate) {
          activeTermExists = true;
          console.log(`Active term found: ${term.name} (${term.startDate} to ${term.endDate})`);
          break;
        }
      }
      
      if (!activeTermExists) {
        console.log('No active term found for current date. Creating a term that includes today...');
        
        // Create a term that includes the current date
        const termStartDate = new Date(currentDate);
        termStartDate.setDate(currentDate.getDate() - 15); // Start 15 days ago
        
        const termEndDate = new Date(currentDate);
        termEndDate.setDate(currentDate.getDate() + 30); // End 30 days from now
        
        const newTerm = await prisma.term.create({
          data: {
            academicYearId: academicYear.id,
            name: 'Current Term',
            startDate: termStartDate,
            endDate: termEndDate
          }
        });
        
        console.log(`Created current term: ${newTerm.name} (${termStartDate} to ${termEndDate})`);
      }
    }

    console.log('\nFix completed successfully!');
    console.log(`Academic year ${currentYear}/${nextYear} is now active.`);
    console.log(`Terms have been created/verified to include the current date (${currentDate.toISOString()}).`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error fixing academic year and term:', error);
    process.exit(1);
  }
}

// Run the fix
fixAcademicYearAndTerm();