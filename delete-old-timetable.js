/**
 * Delete Old Timetable
 * 
 * This script deletes the old S5 - Term 1 timetable
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOldTimetable() {
  try {
    console.log('🔍 Deleting old timetable...\n');

    // Get the timetable
    const timetable = await prisma.doSTimetable.findFirst({
      where: {
        timetableName: 'S5 - Term 1',
      },
      include: {
        _count: { select: { entries: true } },
      },
    });

    if (!timetable) {
      console.log('❌ Timetable not found\n');
      return;
    }

    console.log(`📋 Found timetable: ${timetable.timetableName}`);
    console.log(`   ID: ${timetable.id}`);
    console.log(`   Entries: ${timetable._count.entries}`);
    console.log(`   Time-based: ${timetable.isTimeBased}`);
    console.log(`   Archived: ${timetable.isArchived}\n`);

    // Delete entries first
    if (timetable._count.entries > 0) {
      console.log(`🗑️ Deleting ${timetable._count.entries} entries...`);
      await prisma.doSTimetableEntry.deleteMany({
        where: { timetableId: timetable.id },
      });
      console.log('✅ Entries deleted\n');
    }

    // Delete timetable
    console.log('🗑️ Deleting timetable...');
    await prisma.doSTimetable.delete({
      where: { id: timetable.id },
    });

    console.log('✅ Timetable deleted successfully!\n');
    console.log('You can now create a new timetable from the frontend.\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldTimetable();
