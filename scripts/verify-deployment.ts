/**
 * Deployment Verification Script
 * 
 * Verifies that all components of the bursar communications system are properly set up
 * 
 * Usage: npx tsx scripts/verify-deployment.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Bursar Communications Deployment Verification ===\n');

  let allPassed = true;

  // Check 1: Database Schema
  console.log('1. Checking database schema...');
  try {
    const count = await prisma.feeReminderAutomation.count();
    console.log(`   ✓ FeeReminderAutomation table exists (${count} records)`);
  } catch (error) {
    console.log('   ✗ FeeReminderAutomation table not found');
    allPassed = false;
  }

  // Check 2: Automation Settings
  console.log('\n2. Checking automation settings...');
  try {
    const settings = await prisma.feeReminderAutomation.findMany();
    if (settings.length > 0) {
      console.log(`   ✓ Found ${settings.length} automation setting(s)`);
      settings.forEach(s => {
        console.log(`     - School: ${s.schoolId} | Enabled: ${s.enabled} | Frequency: ${s.frequency}`);
      });
    } else {
      console.log('   ⚠ No automation settings found (run setup script)');
    }
  } catch (error) {
    console.log('   ✗ Error checking automation settings');
    allPassed = false;
  }

  // Check 3: Student Accounts
  console.log('\n3. Checking student accounts...');
  try {
    const accountCount = await prisma.studentAccount.count();
    const defaulterCount = await prisma.studentAccount.count({
      where: { balance: { gt: 0 } }
    });
    console.log(`   ✓ Found ${accountCount} student account(s)`);
    console.log(`   ✓ Found ${defaulterCount} defaulter(s) with outstanding balances`);
  } catch (error) {
    console.log('   ✗ Error checking student accounts');
    allPassed = false;
  }

  // Check 4: Required Files
  console.log('\n4. Checking required files...');
  const requiredFiles = [
    'src/app/(back)/dashboard/bursar/communications/reminders/page.tsx',
    'src/app/api/bursar/communications/send-reminders/route.ts',
    'src/app/api/bursar/communications/automation-settings/route.ts',
    'src/app/api/bursar/communications/test-automation/route.ts',
    'src/app/api/cron/fee-reminders/route.ts',
    'src/services/sms.service.ts',
    'vercel.json',
    '.github/workflows/fee-reminders.yml'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${file}`);
    } else {
      console.log(`   ✗ ${file} not found`);
      allPassed = false;
    }
  }

  // Check 5: Environment Variables
  console.log('\n5. Checking environment variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'AFRICASTALKING_API_KEY',
    'AFRICASTALKING_USERNAME',
    'CRON_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✓ ${envVar} is set`);
    } else {
      console.log(`   ✗ ${envVar} is not set`);
      allPassed = false;
    }
  }

  // Check 6: SMS Service
  console.log('\n6. Checking SMS service configuration...');
  const smsEnv = process.env.AFRICASTALKING_ENVIRONMENT || 'sandbox';
  console.log(`   ✓ Environment: ${smsEnv}`);
  console.log(`   ✓ Username: ${process.env.AFRICASTALKING_USERNAME}`);
  if (smsEnv === 'sandbox') {
    console.log('   ⚠ Running in SANDBOX mode (test only)');
  } else {
    console.log('   ✓ Running in PRODUCTION mode');
  }

  // Check 7: Notification Logs
  console.log('\n7. Checking notification logs...');
  try {
    const logCount = await prisma.financeNotificationLog.count({
      where: { type: 'FEE_REMINDER' }
    });
    console.log(`   ✓ Found ${logCount} fee reminder log(s)`);
  } catch (error) {
    console.log('   ⚠ Error checking notification logs');
  }

  // Summary
  console.log('\n=== Verification Summary ===');
  if (allPassed) {
    console.log('✅ All checks passed! System is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Navigate to http://localhost:3000/dashboard/bursar/communications/reminders');
    console.log('2. Test manual reminders');
    console.log('3. Configure automation settings');
    console.log('4. Deploy to Vercel to activate cron job');
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
    console.log('\nTroubleshooting:');
    console.log('- Run: npx prisma db push');
    console.log('- Run: npx tsx scripts/setup-bursar-communications.ts');
    console.log('- Check .env file for required variables');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
