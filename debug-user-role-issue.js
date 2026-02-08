const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUserRoleIssue() {
  try {
    console.log('🔍 Debugging user role issue...');
    
    // Check the user account that's having issues
    const user = await prisma.user.findFirst({
      where: {
        email: 'mixify055@gmail.com'
      },
      select: {
        id: true,
        email: true,
        role: true,
        roles: true,
        activeRole: true
      }
    });
    
    if (user) {
      console.log('User found:', user);
      
      // Check if this user has a teacher profile
      const teacher = await prisma.teacher.findFirst({
        where: {
          userId: user.id
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          assignedClassIds: true,
          assignedSubjectIds: true,
          classTeacherForIds: true
        }
      });
      
      if (teacher) {
        console.log('Teacher profile found:', teacher);
        console.log('Is class teacher for:', teacher.classTeacherForIds.length, 'classes');
        
        // Check if user should be TEACHER role instead of CLASS_TEACHER
        if (user.role !== 'TEACHER') {
          console.log('❌ User role is incorrect. Should be TEACHER, currently:', user.role);
          
          // Fix the user role
          await prisma.user.update({
            where: { id: user.id },
            data: {
              role: 'TEACHER',
              roles: ['TEACHER'],
              activeRole: 'TEACHER'
            }
          });
          
          console.log('✅ Fixed user role to TEACHER');
        }
      } else {
        console.log('❌ No teacher profile found for this user');
      }
    } else {
      console.log('❌ User not found');
    }
    
    // Also check for any users with invalid roles
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        roles: true
      }
    });
    
    console.log('All users:');
    allUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.role} (roles: ${user.roles?.join(', ') || 'none'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserRoleIssue();