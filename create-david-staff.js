const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDavidStaff() {
  try {
    console.log('🔧 Creating staff record for David adorable with email mixify055@gmail.com');
    
    // First, find the school
    const school = await prisma.school.findUnique({
      where: { code: 'VALLEY' },
      select: { id: true, name: true, code: true }
    });
    
    if (!school) {
      console.log('❌ School VALLEY not found');
      return;
    }
    
    console.log('🏫 School found:', school);
    
    // Check if staff already exists
    const existingStaff = await prisma.staff.findFirst({
      where: {
        schoolId: school.id,
        email: 'mixify055@gmail.com'
      }
    });
    
    if (existingStaff) {
      console.log('⚠️ Staff with this email already exists:', existingStaff);
      return;
    }
    
    // Create User account first
    const user = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: 'mixify055@gmail.com',
        phone: '+256761819886', // Different phone number to avoid conflict
        username: 'david.adorable',
        passwordHash: '$2b$10$dummy.hash.for.testing', // Dummy hash - user will reset password
        role: 'TEACHER',
        roles: ['TEACHER'],
        isActive: true,
        forcePasswordReset: true // Force password reset on first login
      }
    });
    
    console.log('✅ User created:', user.id);
    
    // Create Staff record
    const staff = await prisma.staff.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        employeeNumber: 'TEACH-DAVID-001',
        firstName: 'David',
        lastName: 'adorable',
        phone: '+256761819886', // Different phone number to avoid conflict
        email: 'mixify055@gmail.com',
        role: 'TEACHER',
        status: 'ACTIVE',
        isTeacher: true,
        teacherCode: 'DAVID001'
      }
    });
    
    console.log('✅ Staff created:', staff.id);
    console.log('✅ David adorable staff record created successfully!');
    console.log('📧 Email:', staff.email);
    console.log('📱 Phone:', staff.phone);
    console.log('🆔 User ID:', staff.userId);
    console.log('🔑 Password reset required on first login');
    
  } catch (error) {
    console.error('❌ Error creating staff:', error.message);
    if (error.code === 'P2002') {
      console.log('⚠️ Duplicate key error - record might already exist with different data');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createDavidStaff();