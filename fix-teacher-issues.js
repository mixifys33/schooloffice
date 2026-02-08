const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTeacherIssues() {
  try {
    console.log('🔍 Fixing teacher issues...');
    
    // Fix the activeRole for the user
    const user = await prisma.user.update({
      where: {
        id: '69851287d578a1fe2caf5659'
      },
      data: {
        activeRole: 'TEACHER'
      }
    });
    
    console.log('✅ Fixed activeRole for user:', user.email);
    
    // Check the class that's causing 404 error
    const classId = '695e2248c20bc8e1ef527a05';
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        streams: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (classInfo) {
      console.log('Class found:', classInfo);
    } else {
      console.log('❌ Class not found:', classId);
    }
    
    // Check if the teacher class detail page route exists
    console.log('Checking teacher class routes...');
    
    // Also fix any users with null activeRole
    const usersWithNullActiveRole = await prisma.user.findMany({
      where: {
        activeRole: null
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    
    console.log('Users with null activeRole:', usersWithNullActiveRole.length);
    
    for (const user of usersWithNullActiveRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeRole: user.role }
      });
      console.log(`✅ Fixed activeRole for ${user.email}: ${user.role}`);
    }
    
    // Try to fix any enum issues by updating records that might have null values
    try {
      // Get all schools and ensure they have proper schoolType
      const schools = await prisma.school.findMany({
        select: {
          id: true,
          name: true,
          schoolType: true
        }
      });
      
      console.log('Schools found:', schools.length);
      schools.forEach(school => {
        console.log(`- ${school.name}: ${school.schoolType}`);
      });
      
    } catch (error) {
      console.log('❌ Error checking schools:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixTeacherIssues();