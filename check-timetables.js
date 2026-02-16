/**
 * Check Timetables in Database
 * 
 * This script checks what timetables exist in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimetables() {
  try {
    console.log('🔍 Checking timetables in database...\n');

    // Get all timetables
    const timetables = await prisma.doSTimetable.findMany({
      include: {
        class: { select: { name: true } },
        term: { select: { name: true } },
        school: { select: { name: true } },
        _count: { select: { entries: true } },
      },
    });

    console.log(`Found ${timetables.length} timetable(s)\n`);

    if (timetables.length === 0) {
      console.log('✅ No timetables found - database is empty\n');
    } else {
      for (const tt of timetables) {
        console.log(`\n📋 Timetable: ${tt.timetableName}`);
        console.log(`   ID: ${tt.id}`);
        console.log(`   School: ${tt.school.name}`);
        console.log(`   Class: ${tt.class.name}`);
        console.log(`   Term: ${tt.term.name}`);
        console.log(`   Status: ${tt.status}`);
        console.log(`   Time-based: ${tt.isTimeBased}`);
        console.log(`   Archived: ${tt.isArchived}`);
        console.log(`   Locked: ${tt.isLocked}`);
        console.log(`   Entries: ${tt._count.entries}`);
        console.log(`   Created: ${tt.createdAt}`);
      }
    }

    // Check for any orphaned entries
    const orphanedEntries = await prisma.doSTimetableEntry.findMany({
      where: {
        timetable: null,
      },
    });

    if (orphanedEntries.length > 0) {
      console.log(`\n⚠️ Found ${orphanedEntries.length} orphaned entries (entries without timetable)`);
    }

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimetables();
