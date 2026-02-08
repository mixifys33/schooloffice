const { PrismaClient } = require('@prisma/client');

async function testAuthFlow() {
  console.log('🔧 Testing authentication database flow...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn', 'info'],
  });

  try {
    // Simulate the exact authentication flow
    const schoolCode = 'VALLEY';
    const identifier = 'mixifys33@gmail.com';
    
    console.log('🔧 Step 1: Looking up school...');
    const school = await prisma.school.findUnique({
      where: { code: schoolCode },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        licenseType: true,
      },
    });
    
    if (!school) {
      console.error('❌ School not found');
      return;
    }
    
    console.log('✅ School found:', school.name);
    
    console.log('🔧 Step 2: Looking up user...');
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
          { email: identifier.toUpperCase() },
          { username: identifier.toUpperCase() },
          { email: identifier },
          { username: identifier },
          { phone: identifier },
        ],
      },
      include: {
        staff: {
          select: {
            primaryRole: true,
            secondaryRoles: true,
          },
        },
      },
    });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('✅ User active:', user.isActive);
    console.log('✅ Password hash exists:', !!user.passwordHash);
    console.log('✅ Force password reset:', user.forcePasswordReset);
    
    // Test password verification (without actually verifying)
    console.log('🔧 Step 3: Authentication flow complete');
    console.log('✅ All database operations successful');
    
  } catch (error) {
    console.error('❌ Authentication flow failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthFlow();