const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Searching for user with email: mixify055@gmail.com');
    
    // First, find the school
    const school = await prisma.school.findUnique({
      where: { code: 'VALLEY' },
      select: { id: true, name: true, code: true }
    });
    
    console.log('🏫 School found:', school);
    
    if (!school) {
      console.log('❌ School VALLEY not found');
      return;
    }
    
    // Search for user with exact email match
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        email: 'mixify055@gmail.com'
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        isActive: true,
        role: true
      }
    });
    
    console.log('👤 User found:', user);
    
    if (!user) {
      // Check if user exists with different case
      const userCaseInsensitive = await prisma.user.findFirst({
        where: {
          schoolId: school.id,
          email: { contains: 'mixify055' }
        },
        select: {
          id: true,
          email: true,
          username: true,
          phone: true,
          isActive: true,
          role: true
        }
      });
      
      console.log('👤 User with case-insensitive search:', userCaseInsensitive);
      
      // Check all users in the school to see what emails exist
      const allUsers = await prisma.user.findMany({
        where: {
          schoolId: school.id
        },
        select: {
          email: true,
          username: true,
          role: true,
          isActive: true
        },
        take: 10
      });
      
      console.log('📋 Sample users in school:', allUsers);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();