/**
 * Fix Timetable - Set as Time-Based
 * 
 * This script updates the existing timetable to be time-based
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimetable() {
  try {
    console.log('🔍 Updating timetable to be time-based...\n');

    // Get the timetable
    const timetable = await prisma.doSTimetable.findFirst({
      where: {
        timetableName: 'S5 - Term 1',
      },
    });

    if (!timetable) {
      console.log('❌ Timetable not found\n');
      return;
    }

    console.log(`📋 Found timetable: ${timetable.timetableName}`);
    console.log(`   Current isTimeBased: ${timetable.isTimeBased}`);
    console.log(`   Current isArchived: ${timetable.isArchived}\n`);

    // Update to time-based
    const updated = await prisma.doSTimetable.update({
      where: { id: timetable.id },
      data: {
        isTimeBased: true,
      },
    });

    console.log(`✅ Updated timetable to isTimeBased: ${updated.isTimeBased}\n`);
    console.log('✅ Done! The timetable should now appear in the frontend.\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTimetable();
