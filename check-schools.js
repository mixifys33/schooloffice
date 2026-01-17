/**
 * Check existing schools in the database
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchools() {
  try {
    console.log('Checking existing schools...\n');
    
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (schools.length === 0) {
      console.log('❌ No schools found in the database.');
      console.log('You need to create a school first to test the forgot password flow.');
      return;
    }

    console.log(`✅ Found ${schools.length} school(s):`);
    schools.forEach((school, index) => {
      console.log(`${index + 1}. ${school.name}`);
      console.log(`   Code: ${school.code}`);
      console.log(`   Active: ${school.isActive}`);
      console.log(`   Users: ${school._count.users}`);
      console.log('');
    });

    // Check for users in the first school
    if (schools.length > 0) {
      const firstSchool = schools[0];
      console.log(`Checking users in ${firstSchool.name} (${firstSchool.code})...`);
      
      const users = await prisma.user.findMany({
        where: {
          schoolId: firstSchool.id,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          role: true,
          roles: true
        },
        take: 5
      });

      if (users.length === 0) {
        console.log('❌ No active users found in this school.');
      } else {
        console.log(`✅ Found ${users.length} active user(s):`);
        users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email || user.username || user.phone}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   ID: ${user.id}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('❌ Error checking schools:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchools();