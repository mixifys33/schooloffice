/**
 * Fix Timetable Configuration - Remove invalid special periods
 * 
 * This script checks and fixes timetable configurations that have
 * special periods outside the school hours.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimetableConfig() {
  try {
    console.log('🔍 Checking timetable configurations...\n');

    // Get all timetable configurations
    const configs = await prisma.timetableConfiguration.findMany({
      include: {
        school: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`Found ${configs.length} configuration(s)\n`);

    for (const config of configs) {
      console.log(`\n📋 School: ${config.school.name}`);
      console.log(`   School Hours: ${config.startTime} - ${config.endTime}`);
      console.log(`   Period Duration: ${config.periodDurationMinutes} minutes`);

      const specialPeriods = config.specialPeriods || [];
      console.log(`   Special Periods: ${specialPeriods.length}`);

      if (specialPeriods.length > 0) {
        console.log('\n   Checking special periods:');

        const parseTime = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const schoolStart = parseTime(config.startTime);
        const schoolEnd = parseTime(config.endTime);

        const validPeriods = [];
        const invalidPeriods = [];

        for (const sp of specialPeriods) {
          const spStart = parseTime(sp.startTime);
          const spEnd = parseTime(sp.endTime);

          const isValid = spStart >= schoolStart && spEnd <= schoolEnd;

          if (isValid) {
            validPeriods.push(sp);
            console.log(`   ✅ ${sp.name}: ${sp.startTime}-${sp.endTime} (VALID)`);
          } else {
            invalidPeriods.push(sp);
            console.log(`   ❌ ${sp.name}: ${sp.startTime}-${sp.endTime} (INVALID - outside school hours)`);
          }
        }

        if (invalidPeriods.length > 0) {
          console.log(`\n   🔧 Removing ${invalidPeriods.length} invalid special period(s)...`);

          await prisma.timetableConfiguration.update({
            where: { id: config.id },
            data: {
              specialPeriods: validPeriods,
            },
          });

          console.log(`   ✅ Configuration updated - kept ${validPeriods.length} valid period(s)`);
        } else {
          console.log(`   ✅ All special periods are valid`);
        }
      }
    }

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTimetableConfig();
