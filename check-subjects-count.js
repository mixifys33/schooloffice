const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubjects() {
  try {
    console.log('🔍 Checking subjects in database...\n');

    // Get the school (assuming you have one school in the system)
    const school = await prisma.school.findFirst({
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!school) {
      console.log('❌ No school found in database');
      return;
    }

    console.log(`📚 School: ${school.name} (${school.code})`);
    console.log(`🆔 School ID: ${school.id}\n`);

    // Count total subjects for this school
    const totalSubjects = await prisma.subject.count({
      where: { schoolId: school.id },
    });

    console.log(`📊 Total Subjects: ${totalSubjects}\n`);

    // Get all subjects with details
    const subjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      select: {
        id: true,
        name: true,
        code: true,
        educationLevel: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log('📋 Subject List:\n');
    console.log('─'.repeat(90));
    console.log('No. | Code    | Name                          | Education Level | Active');
    console.log('─'.repeat(90));

    subjects.forEach((subject, index) => {
      const num = String(index + 1).padEnd(3);
      const code = (subject.code || 'N/A').padEnd(7);
      const name = subject.name.padEnd(29);
      const level = (subject.educationLevel || 'N/A').padEnd(15);
      const active = subject.isActive ? '✅ Yes' : '❌ No';
      
      console.log(`${num} | ${code} | ${name} | ${level} | ${active}`);
    });

    console.log('─'.repeat(90));

    // Count by education level
    console.log('\n📊 Subjects by Education Level:\n');
    
    const levels = await prisma.subject.groupBy({
      by: ['educationLevel'],
      where: { schoolId: school.id },
      _count: { educationLevel: true },
    });

    levels.forEach((level) => {
      console.log(`  ${level.educationLevel || 'Uncategorized'}: ${level._count.educationLevel} subjects`);
    });

    // Count active vs inactive
    console.log('\n📊 Subjects by Status:\n');
    
    const activeCount = await prisma.subject.count({
      where: { schoolId: school.id, isActive: true },
    });
    
    const inactiveCount = await prisma.subject.count({
      where: { schoolId: school.id, isActive: false },
    });

    console.log(`  ✅ Active: ${activeCount} subjects`);
    console.log(`  ❌ Inactive: ${inactiveCount} subjects`);

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubjects();
