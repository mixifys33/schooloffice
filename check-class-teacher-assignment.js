const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClassTeacherAssignment() {
  try {
    console.log('🔍 Checking class teacher assignments...\n');

    // Get the current user's email (you'll need to replace this)
    const userEmail = 'mixify055@gmail.com'; // Replace with your email

    // Find the user (need to get schoolId first)
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: userEmail },
          { username: userEmail }
        ]
      },
      select: { id: true, email: true, schoolId: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   School ID:', user.schoolId);

    // Find staff record
    const staff = await prisma.staff.findFirst({
      where: {
        userId: user.id,
        schoolId: user.schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    });

    if (!staff) {
      console.log('❌ Staff record not found');
      return;
    }

    console.log('\n✅ Staff found:', `${staff.firstName} ${staff.lastName}`);
    console.log('   Primary Role:', staff.primaryRole);
    console.log('   Secondary Roles:', staff.secondaryRoles);

    // Check for class teaching responsibility
    const classResponsibility = await prisma.staffResponsibility.findFirst({
      where: {
        staffId: staff.id,
        type: 'CLASS_TEACHING',
      },
    });

    if (!classResponsibility) {
      console.log('\n❌ No CLASS_TEACHING responsibility found');
      console.log('\n📋 Available classes:');
      
      const classes = await prisma.class.findMany({
        where: { schoolId: user.schoolId },
        select: { id: true, name: true },
      });

      classes.forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name} (ID: ${cls.id})`);
      });

      if (classes.length > 0) {
        console.log('\n💡 To assign a class, run:');
        console.log(`   node assign-class-teacher.js "${staff.id}" "${classes[0].id}"`);
      }
    } else {
      console.log('\n✅ CLASS_TEACHING responsibility found');
      console.log('   Details:', JSON.stringify(classResponsibility.details, null, 2));

      const details = classResponsibility.details;
      if (details && details.classId) {
        const assignedClass = await prisma.class.findUnique({
          where: { id: details.classId },
          select: { id: true, name: true },
        });

        if (assignedClass) {
          console.log('   Assigned Class:', assignedClass.name);
        } else {
          console.log('   ⚠️ Assigned class not found in database');
        }
      } else {
        console.log('   ⚠️ No classId in details field');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClassTeacherAssignment();
