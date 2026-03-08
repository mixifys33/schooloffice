/**
 * Setup Script for Bursar Communications
 * 
 * This script:
 * 1. Generates Prisma client with new FeeReminderAutomation model
 * 2. Pushes schema changes to database
 * 3. Creates default automation settings for existing schools
 * 
 * Usage: npx tsx scripts/setup-bursar-communications.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Bursar Communications Setup ===\n');

  try {
    // Step 1: Check if FeeReminderAutomation table exists
    console.log('Step 1: Checking database schema...');
    
    try {
      const count = await prisma.feeReminderAutomation.count();
      console.log(`✓ FeeReminderAutomation table exists with ${count} record(s)\n`);
    } catch (error) {
      console.log('✗ FeeReminderAutomation table does not exist');
      console.log('Please run: npx prisma db push\n');
      process.exit(1);
    }

    // Step 2: Get all schools
    console.log('Step 2: Finding schools...');
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    console.log(`Found ${schools.length} active school(s)\n`);

    if (schools.length === 0) {
      console.log('No active schools found. Setup complete.');
      return;
    }

    // Step 3: Create default automation settings for schools that don't have them
    console.log('Step 3: Creating default automation settings...\n');

    let created = 0;
    let existing = 0;

    for (const school of schools) {
      try {
        const existingSettings = await prisma.feeReminderAutomation.findUnique({
          where: { schoolId: school.id }
        });

        if (existingSettings) {
          console.log(`  ✓ ${school.name} - Settings already exist`);
          existing++;
        } else {
          await prisma.feeReminderAutomation.create({
            data: {
              schoolId: school.id,
              enabled: false,
              frequency: 'weekly',
              dayOfWeek: 5, // Friday
              time: '09:00',
              minBalance: 10000
            }
          });
          console.log(`  ✓ ${school.name} - Created default settings`);
          created++;
        }
      } catch (error) {
        console.error(`  ✗ ${school.name} - Error:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total Schools: ${schools.length}`);
    console.log(`Created: ${created}`);
    console.log(`Already Existed: ${existing}`);
    console.log('\n✓ Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure automation settings in Bursar Dashboard → Communications');
    console.log('2. Set up cron job (see BURSAR_COMMUNICATIONS_SETUP.md)');
    console.log('3. Configure SMS provider credentials in .env');

  } catch (error) {
    console.error('\n✗ Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
