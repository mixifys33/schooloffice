/**
 * Check database for test data
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for test data...\n');

    // Check schools
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      take: 5
    });

    console.log('📚 Schools found:', schools.length);
    if (schools.length > 0) {
      console.log('   First few schools:');
      schools.forEach(school => {
        console.log(`   - ${school.code}: ${school.name}`);
      });
    } else {
      console.log('   ⚠️  No schools found in database');
    }
    console.log('');

    // Check users with email
    const users = await prisma.user.findMany({
      where: {
        email: { not: '' },
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        schoolId: true
      },
      take: 5
    });

    console.log('👥 Active users with email:', users.length);
    if (users.length > 0) {
      console.log('   First few users:');
      for (const user of users) {
        if (user.schoolId) {
          const school = await prisma.school.findUnique({
            where: { id: user.schoolId },
            select: { code: true }
          });
          console.log(`   - ${user.email} (${user.role}) - School: ${school?.code || 'N/A'}`);
        } else {
          console.log(`   - ${user.email} (${user.role}) - School: N/A`);
        }
      }
    } else {
      console.log('   ⚠️  No active users with email found');
    }
    console.log('');

    if (schools.length > 0 && users.length > 0) {
      const testSchool = schools[0];
      const testUser = users.find(u => u.schoolId === testSchool.id) || users[0];
      const userSchool = await prisma.school.findUnique({
        where: { id: testUser.schoolId },
        select: { code: true }
      });

      console.log('✅ Suggested test data:');
      console.log(`   School Code: ${userSchool?.code || testSchool.code}`);
      console.log(`   User Email: ${testUser.email}`);
      console.log('');
      console.log('📝 Update test-forgot-password-complete.js with these values');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();