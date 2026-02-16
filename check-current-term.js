/**
 * Check Current Term Script
 * Shows which academic year and term is currently active
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentTerm() {
  try {
    console.log('🔍 Checking current academic year and term...\n');

    // Get all schools
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (schools.length === 0) {
      console.log('❌ No schools found in database');
      return;
    }

    for (const school of schools) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🏫 School: ${school.name}`);
      console.log(`${'='.repeat(60)}\n`);

      // Get current academic year
      const currentYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: school.id,
          isCurrent: true,
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
        },
      });

      if (!currentYear) {
        console.log('❌ No current academic year set');
        console.log('💡 You need to set an academic year as current in Settings\n');
        continue;
      }

      console.log('📅 Current Academic Year:');
      console.log(`   Name: ${currentYear.name}`);
      console.log(`   Period: ${currentYear.startDate.toLocaleDateString('en-UG')} - ${currentYear.endDate.toLocaleDateString('en-UG')}`);
      console.log(`   Status: ${currentYear.isCurrent ? '✅ Active' : '❌ Inactive'}\n`);

      // Get all terms for this academic year
      const terms = await prisma.term.findMany({
        where: {
          academicYearId: currentYear.id,
        },
        orderBy: {
          startDate: 'asc',
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          weekCount: true,
          isCurrent: true,
        },
      });

      if (terms.length === 0) {
        console.log('❌ No terms found for this academic year');
        console.log('💡 You need to create terms in Settings\n');
        continue;
      }

      console.log(`📋 Terms (${terms.length} total):\n`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentTerm = null;
      let upcomingTerm = null;
      let previousTerm = null;

      terms.forEach((term, index) => {
        const termStart = new Date(term.startDate);
        termStart.setHours(0, 0, 0, 0);
        const termEnd = new Date(term.endDate);
        termEnd.setHours(23, 59, 59, 999);

        let status = '';
        let icon = '';

        if (today >= termStart && today <= termEnd) {
          status = '🟢 ACTIVE (Current Term)';
          icon = '👉';
          currentTerm = term;
        } else if (today < termStart) {
          status = '🔵 Upcoming';
          icon = '  ';
          if (!upcomingTerm) upcomingTerm = term;
        } else {
          status = '⚪ Completed';
          icon = '  ';
          previousTerm = term;
        }

        console.log(`${icon} ${index + 1}. ${term.name}`);
        console.log(`      Period: ${termStart.toLocaleDateString('en-UG')} - ${termEnd.toLocaleDateString('en-UG')}`);
        console.log(`      Weeks: ${term.weekCount}`);
        console.log(`      Status: ${status}`);
        console.log(`      isCurrent flag: ${term.isCurrent ? '✅ true' : '❌ false'}`);
        console.log('');
      });

      // Summary
      console.log(`\n${'─'.repeat(60)}`);
      console.log('📊 SUMMARY:');
      console.log(`${'─'.repeat(60)}\n`);

      if (currentTerm) {
        console.log('✅ You are currently in:');
        console.log(`   ${currentTerm.name}`);
        console.log(`   ${new Date(currentTerm.startDate).toLocaleDateString('en-UG')} - ${new Date(currentTerm.endDate).toLocaleDateString('en-UG')}`);
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((new Date(currentTerm.endDate) - today) / (1000 * 60 * 60 * 24));
        console.log(`   Days remaining: ${daysRemaining} days\n`);
      } else if (upcomingTerm) {
        console.log('⏳ No active term right now');
        console.log(`   Next term: ${upcomingTerm.name}`);
        console.log(`   Starts: ${new Date(upcomingTerm.startDate).toLocaleDateString('en-UG')}`);
        
        const daysUntil = Math.ceil((new Date(upcomingTerm.startDate) - today) / (1000 * 60 * 60 * 24));
        console.log(`   Starts in: ${daysUntil} days\n`);
      } else if (previousTerm) {
        console.log('⚠️  All terms have ended');
        console.log(`   Last term: ${previousTerm.name}`);
        console.log(`   Ended: ${new Date(previousTerm.endDate).toLocaleDateString('en-UG')}\n`);
      }

      // Check for data in current term
      if (currentTerm) {
        console.log('📈 Data in current term:');
        
        const [caCount, examCount, paymentCount] = await Promise.all([
          prisma.cAEntry.count({ where: { termId: currentTerm.id } }),
          prisma.examEntry.count({ where: { termId: currentTerm.id } }),
          prisma.payment.count({ where: { termId: currentTerm.id } }),
        ]);

        console.log(`   CA Entries: ${caCount}`);
        console.log(`   Exam Entries: ${examCount}`);
        console.log(`   Payments: ${paymentCount}\n`);
      }

      console.log('💡 Tips:');
      console.log('   • The "isCurrent" flag should match the active term');
      console.log('   • If dates don\'t match reality, edit them in Settings');
      console.log('   • CA/Exam entries are linked to specific terms');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentTerm();
