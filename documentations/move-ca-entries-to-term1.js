/**
 * Move CA Entries from Term 2 to Term 1
 * This will move all CA entries from the upcoming term to the current term
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function moveCAEntries() {
  try {
    console.log('🔍 Finding terms...\n');

    // Get Term 1 and Term 2
    const term1 = await prisma.term.findFirst({
      where: { name: 'Term 1' },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    const term2 = await prisma.term.findFirst({
      where: { name: 'Term 2' },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (!term1 || !term2) {
      console.log('❌ Could not find both terms');
      return;
    }

    console.log('📅 Term 1:');
    console.log(`   ID: ${term1.id}`);
    console.log(`   Period: ${term1.startDate.toLocaleDateString('en-UG')} - ${term1.endDate.toLocaleDateString('en-UG')}\n`);

    console.log('📅 Term 2:');
    console.log(`   ID: ${term2.id}`);
    console.log(`   Period: ${term2.startDate.toLocaleDateString('en-UG')} - ${term2.endDate.toLocaleDateString('en-UG')}\n`);

    // Count CA entries in Term 2
    const term2Entries = await prisma.cAEntry.count({
      where: { termId: term2.id },
    });

    console.log(`📊 CA entries in Term 2: ${term2Entries}`);

    if (term2Entries === 0) {
      console.log('✅ No CA entries to move\n');
      return;
    }

    console.log(`\n⚠️  This will move ${term2Entries} CA entries from Term 2 to Term 1\n`);

    // Move the entries
    console.log('🔄 Moving CA entries...\n');

    const result = await prisma.cAEntry.updateMany({
      where: { termId: term2.id },
      data: { termId: term1.id },
    });

    console.log(`✅ SUCCESS! Moved ${result.count} CA entries from Term 2 to Term 1\n`);

    // Verify
    const term1Count = await prisma.cAEntry.count({
      where: { termId: term1.id },
    });

    const term2Count = await prisma.cAEntry.count({
      where: { termId: term2.id },
    });

    console.log('📊 Final counts:');
    console.log(`   Term 1: ${term1Count} CA entries`);
    console.log(`   Term 2: ${term2Count} CA entries\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

moveCAEntries();
