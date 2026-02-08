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
    
    // Search for user with different variations
    const users = await prisma.user.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { email: 'mixify055@gmail.com' },
          { email: { contains: 'mixify055' } },
          { username: 'mixify055@gmail.com' },
          { username: { contains: 'mixify055' } }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        isActive: true,
        role: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log('👥 Users found:', users.length);
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        isActive: user.isActive,
        role: user.role,
        staffName: user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : 'No staff profile'
      });
    });
    
    // Also check if there are any inactive users
    const inactiveUsers = await prisma.user.findMany({
      where: {
        schoolId: school.id,
        isActive: false,
        OR: [
          { email: 'mixify055@gmail.com' },
          { email: { contains: 'mixify055' } },
          { username: 'mixify055@gmail.com' },
          { username: { contains: 'mixify055' } }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
        role: true
      }
    });
    
    if (inactiveUsers.length > 0) {
      console.log('⚠️ Inactive users found:', inactiveUsers.length);
      inactiveUsers.forEach((user, index) => {
        console.log(`Inactive User ${index + 1}:`, {
          id: user.id,
          email: user.email,
          username: user.username,
          isActive: user.isActive,
          role: user.role
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();