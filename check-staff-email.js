const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStaffEmail() {
  try {
    console.log('🔍 Searching for staff with email: mixify055@gmail.com');
    
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
    
    // Search for staff with the email
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId: school.id,
        email: 'mixify055@gmail.com'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        userId: true,
        employeeNumber: true
      }
    });
    
    console.log('👤 Staff found:', staff);
    
    if (staff) {
      // Now check if there's a corresponding User record
      const user = await prisma.user.findUnique({
        where: { id: staff.userId },
        select: {
          id: true,
          email: true,
          username: true,
          phone: true,
          isActive: true,
          role: true
        }
      });
      
      console.log('👤 Corresponding User record:', user);
      
      if (!user) {
        console.log('❌ No User record found for this staff member!');
        console.log('🔧 This explains why forgot password is not working.');
        console.log('🔧 The staff exists but has no login account.');
      } else if (!user.isActive) {
        console.log('⚠️ User account exists but is inactive!');
      } else if (user.email !== staff.email) {
        console.log('⚠️ Email mismatch between Staff and User records!');
        console.log(`   Staff email: ${staff.email}`);
        console.log(`   User email: ${user.email}`);
      }
    } else {
      console.log('❌ No staff found with email: mixify055@gmail.com');
      
      // Check if there are any staff with similar emails
      const similarStaff = await prisma.staff.findMany({
        where: {
          schoolId: school.id,
          email: { contains: 'mixify' }
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true
        }
      });
      
      console.log('📋 Staff with similar emails:', similarStaff);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStaffEmail();