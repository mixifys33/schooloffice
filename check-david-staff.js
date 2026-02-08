const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDavidStaff() {
  try {
    console.log('🔍 Searching for staff named David...');
    
    // First, find the school
    const school = await prisma.school.findUnique({
      where: { code: 'VALLEY' },
      select: { id: true, name: true, code: true }
    });
    
    if (!school) {
      console.log('❌ School VALLEY not found');
      return;
    }
    
    // Search for staff with first name David or containing "adorable"
    const staffMembers = await prisma.staff.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { firstName: { contains: 'David' } },
          { lastName: { contains: 'adorable' } },
          { firstName: { contains: 'adorable' } },
          { lastName: { contains: 'David' } }
        ]
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
        employeeNumber: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            phone: true,
            isActive: true,
            role: true
          }
        }
      }
    });
    
    console.log(`👥 Found ${staffMembers.length} staff members:`);
    
    staffMembers.forEach((staff, index) => {
      console.log(`\n--- Staff Member ${index + 1} ---`);
      console.log(`Name: ${staff.firstName} ${staff.lastName}`);
      console.log(`Email: ${staff.email}`);
      console.log(`Phone: ${staff.phone}`);
      console.log(`Role: ${staff.role}`);
      console.log(`Status: ${staff.status}`);
      console.log(`Employee Number: ${staff.employeeNumber}`);
      console.log(`User ID: ${staff.userId}`);
      
      if (staff.user) {
        console.log(`User Account:`);
        console.log(`  - Email: ${staff.user.email}`);
        console.log(`  - Username: ${staff.user.username}`);
        console.log(`  - Phone: ${staff.user.phone}`);
        console.log(`  - Active: ${staff.user.isActive}`);
        console.log(`  - Role: ${staff.user.role}`);
      } else {
        console.log(`❌ No User account linked!`);
      }
    });
    
    if (staffMembers.length === 0) {
      console.log('❌ No staff found with name David or adorable');
      
      // Let's check all staff in the school
      const allStaff = await prisma.staff.findMany({
        where: { schoolId: school.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true
        },
        take: 10
      });
      
      console.log('\n📋 All staff in school (first 10):');
      allStaff.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.firstName} ${staff.lastName} - ${staff.email} (${staff.role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDavidStaff();