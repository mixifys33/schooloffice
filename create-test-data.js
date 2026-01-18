/**
 * Create test data for forgot password testing
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🔧 Creating test data for forgot password testing...\n');

    // Create test school
    console.log('1. Creating test school...');
    const school = await prisma.school.upsert({
      where: { code: 'TESTSCHOOL' },
      update: {},
      create: {
        name: 'Test School for Password Reset',
        code: 'TESTSCHOOL',
        isActive: true,
        licenseType: 'BASIC',
        address: '123 Test Street',
        phone: '+256700000000',
        email: 'admin@testschool.com'
      }
    });

    console.log('   ✅ Test school created/updated:', school.code);

    // Create test user with your actual email for testing
    console.log('\n2. Creating test user...');
    const passwordHash = await bcrypt.hash('Test@123456', 12);
    
    const user = await prisma.user.upsert({
      where: { email: 'p4147176@gmail.com' }, // Using your actual email for testing
      update: {
        schoolId: school.id, // Make sure user is in the test school
        isActive: true,
        status: 'ACTIVE'
      },
      create: {
        email: 'p4147176@gmail.com',
        passwordHash,
        schoolId: school.id,
        role: 'TEACHER',
        roles: ['TEACHER'],
        activeRole: 'TEACHER',
        isActive: true,
        status: 'ACTIVE',
        phone: '+256700000001'
      }
    });

    console.log('   ✅ Test user created/updated:', user.email);

    // Create another test user with a different email
    const user2 = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        schoolId: school.id,
        isActive: true,
        status: 'ACTIVE'
      },
      create: {
        email: 'test@example.com',
        passwordHash,
        schoolId: school.id,
        role: 'TEACHER',
        roles: ['TEACHER'],
        activeRole: 'TEACHER',
        isActive: true,
        status: 'ACTIVE',
        phone: '+256700000002'
      }
    });

    console.log('   ✅ Second test user created/updated:', user2.email);

    console.log('\n🧪 Test credentials created:');
    console.log('School Code: TESTSCHOOL');
    console.log('Email 1: p4147176@gmail.com (your actual email - will receive emails)');
    console.log('Email 2: test@example.com (test email)');
    console.log('Password: Test@123456');
    
    console.log('\n📧 To test forgot password:');
    console.log('1. Go to http://localhost:3000/forgot-password');
    console.log('2. Enter School Code: TESTSCHOOL');
    console.log('3. Enter Email: p4147176@gmail.com');
    console.log('4. Choose Email method');
    console.log('5. Check your email inbox AND server console logs');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    
    if (error.code === 'P2002') {
      console.log('\n💡 This error usually means the data already exists.');
      console.log('   The upsert should handle this, but there might be a unique constraint issue.');
    }
    
    if (error.message.includes('connection')) {
      console.log('\n💡 Database connection error. Check your DATABASE_URL in .env');
      console.log('   Current DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();