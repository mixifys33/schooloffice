/**
 * Script to check the current state of academic years and terms in the database
 */
require('dotenv').config();

async function checkAcademicYearsAndTerms() {
  try {
    // Import Prisma Client
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log('Checking academic years...');
    
    // Get all academic years
    const academicYears = await prisma.academicYear.findMany({
      include: {
        terms: true,
        school: true
      },
      orderBy: { startDate: 'desc' }
    });

    console.log('\n=== Academic Years ===');
    if (academicYears.length === 0) {
      console.log('No academic years found in the database.');
    } else {
      academicYears.forEach(year => {
        console.log(`\nAcademic Year: ${year.name}`);
        console.log(`  ID: ${year.id}`);
        console.log(`  School: ${year.school.name} (${year.schoolId})`);
        console.log(`  Start Date: ${year.startDate}`);
        console.log(`  End Date: ${year.endDate}`);
        console.log(`  Is Active: ${year.isActive}`);
        
        console.log(`  Terms (${year.terms.length}):`);
        if (year.terms.length === 0) {
          console.log('    No terms found for this academic year.');
        } else {
          year.terms.forEach(term => {
            const now = new Date();
            const isCurrent = term.startDate <= now && term.endDate >= now;
            console.log(`    - ${term.name}: ${term.startDate} to ${term.endDate} ${isCurrent ? '(CURRENT)' : ''}`);
          });
        }
      });
    }

    // Check specifically for active academic year
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        },
        school: true
      }
    });

    console.log('\n=== Active Academic Year ===');
    if (activeAcademicYear) {
      console.log(`Active Academic Year: ${activeAcademicYear.name}`);
      console.log(`  ID: ${activeAcademicYear.id}`);
      console.log(`  School: ${activeAcademicYear.school.name}`);
      console.log(`  Dates: ${activeAcademicYear.startDate} to ${activeAcademicYear.endDate}`);

      console.log(`  Terms:`);
      const now = new Date();
      activeAcademicYear.terms.forEach(term => {
        const isCurrent = term.startDate <= now && term.endDate >= now;
        console.log(`    - ${term.name}: ${term.startDate} to ${term.endDate} ${isCurrent ? '(CURRENT)' : ''}`);
      });
      
      // Check if any term is currently active
      const currentTerm = activeAcademicYear.terms.find(term => 
        term.startDate <= now && term.endDate >= now
      );
      
      if (currentTerm) {
        console.log(`\n✓ Current active term found: ${currentTerm.name}`);
      } else {
        console.log(`\n✗ No current active term found for today's date (${now.toISOString()})`);
      }
    } else {
      console.log('No active academic year found in the database.');
      console.log('This is likely the cause of the "No active term found for the current date" error.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking academic years and terms:', error);
    process.exit(1);
  }
}

// Run the check
checkAcademicYearsAndTerms();