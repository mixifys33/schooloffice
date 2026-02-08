const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingData() {
  console.log('🔍 Checking existing database records for testing...\n');

  try {
    // Check existing schools
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log('🏫 Existing Schools:');
    if (schools.length === 0) {
      console.log('   No schools found in database');
    } else {
      schools.forEach((school, index) => {
        console.log(`   ${index + 1}. ${school.name} (${school.code})`);
        console.log(`      ID: ${school.id}`);
        console.log(`      Email: ${school.email || 'No email'}`);
        console.log(`      Active: ${school.isActive ? 'Yes' : 'No'}`);
        console.log(`      Created: ${school.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // Check existing users with email addresses
    const users = await prisma.user.findMany({
      where: {
        email: {
          not: null,
          not: ''
        },
        isActive: true,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        schoolId: true,
        lastLogin: true,
        createdAt: true,
        school: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n👥 Active Users with Email Addresses:');
    if (users.length === 0) {
      console.log('   No active users with email addresses found');
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Username: ${user.username || 'No username'}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      School: ${user.school ? `${user.school.name} (${user.school.code})` : 'No school (Super Admin)'}`);
        console.log(`      Last Login: ${user.lastLogin ? user.lastLogin.toISOString() : 'Never'}`);
        console.log(`      Created: ${user.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // Check for users specifically in schools (non-super-admin)
    const schoolUsers = users.filter(user => user.schoolId !== null);
    console.log('\n🏢 School Users (Good for testing):');
    if (schoolUsers.length === 0) {
      console.log('   No school users found');
    } else {
      schoolUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role})`);
        console.log(`      School: ${user.school.name} (${user.school.code})`);
        console.log(`      Last Login: ${user.lastLogin ? user.lastLogin.toISOString() : 'Never'}`);
        console.log('');
      });
    }

    // Check for super admin users
    const superAdmins = users.filter(user => user.role === 'SUPER_ADMIN');
    console.log('\n👑 Super Admin Users:');
    if (superAdmins.length === 0) {
      console.log('   No super admin users found');
    } else {
      superAdmins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.email}`);
        console.log(`      Last Login: ${admin.lastLogin ? admin.lastLogin.toISOString() : 'Never'}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total Schools: ${schools.length}`);
    console.log(`   Total Active Users with Email: ${users.length}`);
    console.log(`   School Users: ${schoolUsers.length}`);
    console.log(`   Super Admin Users: ${superAdmins.length}`);

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingData();