/**
 * Check for Orphaned CA Entries
 * Find CA entries that reference deleted terms
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrphanedEntries() {
  try {
    console.log('🔍 Checking for orphaned CA entries...\n');

    // Get all CA entries
    const allCAEntries = await prisma.cAEntry.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        termId: true,
        studentId: true,
        subjectId: true,
        rawScore: true,
        status: true,
      },
    });

    console.log(`📊 Total CA entries in database: ${allCAEntries.length}\n`);

    if (allCAEntries.length === 0) {
      console.log('✅ No CA entries found');
      return;
    }

    // Get all valid term IDs
    const validTerms = await prisma.term.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const validTermIds = new Set(validTerms.map(t => t.id));
    console.log(`📋 Valid terms: ${validTerms.map(t => t.name).join(', ')}\n`);

    // Find orphaned entries
    const orphanedEntries = allCAEntries.filter(entry => !validTermIds.has(entry.termId));

    if (orphanedEntries.length === 0) {
      console.log('✅ No orphaned CA entries found. All entries are linked to valid terms.');
      return;
    }

    console.log(`❌ Found ${orphanedEntries.length} orphaned CA entries:\n`);

    // Group by term ID
    const byTerm = new Map();
    orphanedEntries.forEach(entry => {
      if (!byTerm.has(entry.termId)) {
        byTerm.set(entry.termId, []);
      }
      byTerm.get(entry.termId).push(entry);
    });

    for (const [termId, entries] of byTerm.entries()) {
      console.log(`📌 Orphaned Term ID: ${termId}`);
      console.log(`   Entries: ${entries.length}`);
      console.log(`   CA Names: ${[...new Set(entries.map(e => e.name))].join(', ')}`);
      console.log(`   Types: ${[...new Set(entries.map(e => e.type))].join(', ')}`);
      console.log('');
    }

    console.log('⚠️  These entries reference deleted terms and should be cleaned up.\n');

    // Ask if user wants to delete them
    console.log('💡 To delete these orphaned entries, run:');
    console.log('   node delete-orphaned-ca-entries.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphanedEntries();
