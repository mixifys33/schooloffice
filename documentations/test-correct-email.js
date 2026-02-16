const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCorrectEmail() {
  try {
    console.log('🔍 Testing forgot password with correct email: mixifys33@gmail.com');
    
    // Find the school
    const school = await prisma.school.findUnique({
      where: { code: 'VALLEY' },
      select: { id: true }
    });
    
    if (!school) {
      console.log('❌ School VALLEY not found');
      return;
    }
    
    // Test the exact query used in forgot password API
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: 'mixifys33@gmail.com'.toLowerCase() },
          { phone: 'mixifys33@gmail.com' },
          { username: 'mixifys33@gmail.com'.toLowerCase() },
        ],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
      }
    });
    
    console.log('✅ User lookup result:', user);
    
    if (user) {
      console.log('✅ User found! Forgot password should work with this email.');
      console.log('📧 Email:', user.email);
      console.log('📱 Phone:', user.phone || 'Not set');
      console.log('🆔 User ID:', user.id);
    } else {
      console.log('❌ User not found with the query used in forgot password API');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCorrectEmail();