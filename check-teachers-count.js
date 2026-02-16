const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeachersCount() {
  try {
    console.log('🔍 Checking teachers/staff count...\n');

    // Get school
    const school = await prisma.school.findFirst({
      where: { code: 'VALLEY' },
      select: { id: true, name: true, code: true }
    });

    if (!school) {
      console.log('❌ School not found');
      return;
    }

    console.log(`📚 School: ${school.name} (${school.code})`);
    console.log(`🆔 School ID: ${school.id}\n`);

    // Get all staff members
    const allStaff = await prisma.staff.findMany({
      where: { schoolId: school.id },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            activeRole: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('═'.repeat(90));
    console.log(`📊 TOTAL STAFF MEMBERS: ${allStaff.length}`);
    console.log('═'.repeat(90));

    if (allStaff.length === 0) {
      console.log('\n❌ No staff members found in the database\n');
      return;
    }

    // Group by primary role
    const byRole = {};
    allStaff.forEach(staff => {
      const role = staff.primaryRole || 'UNASSIGNED';
      if (!byRole[role]) {
        byRole[role] = [];
      }
      byRole[role].push(staff);
    });

    console.log('\n📋 STAFF BY PRIMARY ROLE:\n');
    Object.keys(byRole).sort().forEach(role => {
      console.log(`${role}: ${byRole[role].length} staff member(s)`);
    });

    // Count active vs inactive
    const activeStaff = allStaff.filter(s => s.isActive);
    const inactiveStaff = allStaff.filter(s => !s.isActive);

    console.log('\n📊 STAFF STATUS:\n');
    console.log(`✅ Active: ${activeStaff.length}`);
    console.log(`❌ Inactive: ${inactiveStaff.length}`);

    // List all staff with details
    console.log('\n' + '─'.repeat(90));
    console.log('📝 DETAILED STAFF LIST:');
    console.log('─'.repeat(90));

    allStaff.forEach((staff, index) => {
      console.log(`\n${index + 1}. ${staff.firstName} ${staff.lastName}`);
      console.log(`   └─ Employee #: ${staff.employeeNumber}`);
      console.log(`   └─ Email: ${staff.user?.email || 'N/A'}`);
      console.log(`   └─ Username: ${staff.user?.username || 'N/A'}`);
      console.log(`   └─ Primary Role: ${staff.primaryRole}`);
      console.log(`   └─ Secondary Roles: ${staff.secondaryRoles?.length > 0 ? staff.secondaryRoles.join(', ') : 'None'}`);
      console.log(`   └─ User Role: ${staff.user?.activeRole || 'N/A'}`);
      console.log(`   └─ Status: ${staff.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   └─ Joined: ${staff.createdAt.toLocaleDateString()}`);
    });

    // Check subject assignments
    const staffWithAssignments = await prisma.staff.findMany({
      where: { 
        schoolId: school.id,
        staffSubjects: {
          some: {}
        }
      },
      include: {
        staffSubjects: {
          include: {
            subject: { select: { name: true, code: true } },
            class: { select: { name: true } }
          }
        }
      }
    });

    console.log('\n' + '─'.repeat(90));
    console.log('👨‍🏫 STAFF WITH SUBJECT ASSIGNMENTS:');
    console.log('─'.repeat(90));
    console.log(`\nTotal: ${staffWithAssignments.length} out of ${allStaff.length} staff have subject assignments\n`);

    if (staffWithAssignments.length > 0) {
      staffWithAssignments.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.employeeNumber})`);
        console.log(`   Teaches ${staff.staffSubjects.length} subject(s):`);
        staff.staffSubjects.forEach(assignment => {
          console.log(`   └─ ${assignment.subject.name} (${assignment.subject.code}) - Class: ${assignment.class.name}`);
        });
        console.log('');
      });
    }

    // Summary
    console.log('═'.repeat(90));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(90));
    console.log(`\n✅ Total Staff: ${allStaff.length}`);
    console.log(`✅ Active Staff: ${activeStaff.length}`);
    console.log(`✅ Staff with Subject Assignments: ${staffWithAssignments.length}`);
    console.log(`❌ Staff without Subject Assignments: ${allStaff.length - staffWithAssignments.length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeachersCount();
