/**
 * Check CA Entries by Term
 * Show which CA entries belong to which term
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCAEntriesByTerm() {
  try {
    console.log('🔍 Checking CA entries by term...\n');

    // Get all terms
    const terms = await prisma.term.findMany({
      include: {
        academicYear: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    console.log(`📋 Found ${terms.length} terms\n`);

    for (const term of terms) {
      console.log(`${'='.repeat(60)}`);
      console.log(`📅 ${term.name} (${term.academicYear.name})`);
      console.log(`   Period: ${term.startDate.toLocaleDateString('en-UG')} - ${term.endDate.toLocaleDateString('en-UG')}`);
      console.log(`${'='.repeat(60)}\n`);

      // Get CA entries for this term
      const caEntries = await prisma.cAEntry.findMany({
        where: {
          termId: term.id,
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          subject: {
            select: {
              name: true,
            },
          },
        },
      });

      if (caEntries.length === 0) {
        console.log('   ✅ No CA entries\n');
        continue;
      }

      console.log(`   📊 Total CA entries: ${caEntries.length}\n`);

      // Group by CA name
      const byName = new Map();
      caEntries.forEach(entry => {
        const key = `${entry.name} - ${entry.subject.name}`;
        if (!byName.has(key)) {
          byName.set(key, []);
        }
        byName.get(key).push(entry);
      });

      console.log('   CA Entries:\n');
      for (const [name, entries] of byName.entries()) {
        console.log(`   📝 ${name}`);
        console.log(`      Students: ${entries.length}`);
        console.log(`      Type: ${entries[0].type}`);
        console.log(`      Max Score: ${entries[0].maxScore}`);
        console.log(`      Status: ${entries[0].status}`);
        console.log(`      Sample students: ${entries.slice(0, 3).map(e => `${e.student.firstName} ${e.student.lastName}`).join(', ')}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCAEntriesByTerm();
