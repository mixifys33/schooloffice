const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignClassTeacher() {
  try {
    const staffId = process.argv[2];
    const classId = process.argv[3];

    if (!staffId || !classId) {
      console.log('❌ Usage: node assign-class-teacher.js <staffId> <classId>');
      console.log('\n💡 Run check-class-teacher-assignment.js first to get IDs');
      return;
    }

    console.log('🔄 Assigning class teacher...\n');

    // Verify staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, firstName: true, lastName: true, schoolId: true },
    });

    if (!staff) {
      console.log('❌ Staff not found');
      return;
    }

    // Verify class exists
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, schoolId: true },
    });

    if (!classRecord) {
      console.log('❌ Class not found');
      return;
    }

    if (staff.schoolId !== classRecord.schoolId) {
      console.log('❌ Staff and class are in different schools');
      return;
    }

    // Check if responsibility already exists
    const existing = await prisma.staffResponsibility.findFirst({
      where: {
        staffId: staff.id,
        type: 'CLASS_TEACHING',
      },
    });

    if (existing) {
      console.log('⚠️ Existing CLASS_TEACHING responsibility found. Updating...');
      
      await prisma.staffResponsibility.update({
        where: { id: existing.id },
        data: {
          details: { classId: classRecord.id },
          updatedAt: new Date(),
        },
      });

      console.log('✅ Updated existing responsibility');
    } else {
      console.log('📝 Creating new CLASS_TEACHING responsibility...');
      
      await prisma.staffResponsibility.create({
        data: {
          schoolId: staff.schoolId,
          staffId: staff.id,
          type: 'CLASS_TEACHING',
          details: { classId: classRecord.id },
          assignedBy: staff.id, // Self-assigned for now
        },
      });

      console.log('✅ Created new responsibility');
    }

    console.log('\n✅ Assignment complete!');
    console.log(`   Staff: ${staff.firstName} ${staff.lastName}`);
    console.log(`   Class: ${classRecord.name}`);
    console.log('\n💡 Refresh the performance page to see the data');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignClassTeacher();
