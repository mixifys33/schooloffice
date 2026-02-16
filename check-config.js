/**
 * Check Timetable Configuration
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
  try {
    console.log('🔍 Checking timetable configuration...\n');

    const config = await prisma.timetableConfiguration.findMany({
      include: {
        school: { select: { name: true } },
      },
    });

    console.log(`Found ${config.length} configuration(s)\n`);

    if (config.length === 0) {
      console.log('❌ No configuration found in database\n');
    } else {
      for (const c of config) {
        console.log(`📋 School: ${c.school.name}`);
        console.log(`   Start Time: ${c.startTime}`);
        console.log(`   End Time: ${c.endTime}`);
        console.log(`   Period Duration: ${c.periodDurationMinutes} minutes`);
        console.log(`   Special Periods: ${JSON.stringify(c.specialPeriods, null, 2)}`);
        console.log(`   Created: ${c.createdAt}`);
        console.log(`   Updated: ${c.updatedAt}\n`);
      }
    }

    console.log('✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig();
