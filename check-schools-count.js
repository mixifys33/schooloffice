/**
 * Check how many schools are in the database
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchoolsCount() {
  try {
    console.log('🔍 Counting schools in database...\n');

    // Get total count of schools
    const totalSchools = await prisma.school.count();
    console.log(`📊 Total schools: ${totalSchools}`);

    if (totalSchools > 0) {
      console.log('\n🏫 School details:');
      
      // Get all schools with basic info
      const schools = await prisma.school.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              classes: true,
              subjects: true,
              students: true,
              staff: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      schools.forEach((school, index) => {
        console.log(`${index + 1}. ${school.name}`);
        console.log(`   ID: ${school.id}`);
        console.log(`   Created: ${school.createdAt.toLocaleDateString()}`);
        console.log(`   Classes: ${school._count.classes}`);
        console.log(`   Subjects: ${school._count.subjects}`);
        console.log(`   Students: ${school._count.students}`);
        console.log(`   Staff: ${school._count.staff}`);
        console.log('');
      });
    } else {
      console.log('❌ No schools found in the database');
    }

  } catch (error) {
    console.error('❌ Error checking schools:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchoolsCount();