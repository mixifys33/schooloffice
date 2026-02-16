/**
 * Check SchoolId Mismatch
 * 
 * This script checks if there's a schoolId mismatch between the user session and timetables
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchoolIdMismatch() {
  try {
    console.log('🔍 Checking for schoolId mismatches...\n');

    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, code: true },
    });

    console.log(`Found ${schools.length} school(s):\n`);
    for (const school of schools) {
      console.log(`   📋 ${school.name} (${school.code})`);
      console.log(`      ID: ${school.id}\n`);
    }

    // Get all timetables with their school info
    const timetables = await prisma.doSTimetable.findMany({
      select: {
        id: true,
        timetableName: true,
        schoolId: true,
        school: { select: { name: true, code: true } },
      },
    });

    console.log(`\nFound ${timetables.length} timetable(s):\n`);
    for (const tt of timetables) {
      console.log(`   📋 ${tt.timetableName}`);
      console.log(`      Timetable ID: ${tt.id}`);
      console.log(`      School ID: ${tt.schoolId}`);
      console.log(`      School: ${tt.school.name} (${tt.school.code})\n`);
    }

    // Get all users with their school info
    const users = await prisma.user.findMany({
      where: {
        schoolId: { not: null },
      },
      select: {
        id: true,
        email: true,
        schoolId: true,
        school: { select: { name: true, code: true } },
      },
    });

    console.log(`\nFound ${users.length} user(s) with school assignments:\n`);
    for (const user of users) {
      console.log(`   👤 ${user.email}`);
      console.log(`      User ID: ${user.id}`);
      console.log(`      School ID: ${user.schoolId}`);
      console.log(`      School: ${user.school?.name} (${user.school?.code})\n`);
    }

    // Check for mismatches
    console.log('\n🔍 Checking for mismatches...\n');
    
    const uniqueSchoolIds = new Set([
      ...schools.map(s => s.id),
      ...timetables.map(t => t.schoolId),
      ...users.map(u => u.schoolId).filter(Boolean),
    ]);

    console.log(`Total unique school IDs in use: ${uniqueSchoolIds.size}`);
    console.log(`School IDs: ${Array.from(uniqueSchoolIds).join(', ')}\n`);

    if (uniqueSchoolIds.size > 1) {
      console.log('⚠️ WARNING: Multiple school IDs detected!');
      console.log('   This could cause timetables to not show up if user and timetable have different schoolIds\n');
    } else {
      console.log('✅ All records use the same school ID\n');
    }

    console.log('✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchoolIdMismatch();
