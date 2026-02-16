/**
 * Delete Term 3 and All Related Data
 * This will permanently delete Term 3 and all CA entries associated with it
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTerm3() {
  try {
    console.log('🔍 Finding Term 3...\n');

    // Find Term 3
    const term3 = await prisma.term.findFirst({
      where: {
        name: 'Term 3',
      },
      include: {
        academicYear: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!term3) {
      console.log('❌ Term 3 not found');
      return;
    }

    console.log('📋 Term 3 Details:');
    console.log(`   ID: ${term3.id}`);
    console.log(`   Name: ${term3.name}`);
    console.log(`   Academic Year: ${term3.academicYear.name}`);
    console.log(`   Period: ${term3.startDate.toLocaleDateString('en-UG')} - ${term3.endDate.toLocaleDateString('en-UG')}`);
    console.log('');

    // Check for related data
    console.log('🔍 Checking for related data...\n');

    const [
      caEntriesCount,
      examEntriesCount,
      examsCount,
      resultsCount,
      paymentsCount,
      feeStructuresCount,
      timetablesCount,
      studentAccountsCount,
    ] = await Promise.all([
      prisma.cAEntry.count({ where: { termId: term3.id } }),
      prisma.examEntry.count({ where: { termId: term3.id } }),
      prisma.exam.count({ where: { termId: term3.id } }),
      prisma.result.count({ where: { termId: term3.id } }),
      prisma.payment.count({ where: { termId: term3.id } }),
      prisma.feeStructure.count({ where: { termId: term3.id } }),
      prisma.timetableDraft.count({ where: { termId: term3.id } }),
      prisma.studentAccount.count({ where: { termId: term3.id } }),
    ]);

    console.log('📊 Related Data Found:');
    console.log(`   CA Entries: ${caEntriesCount}`);
    console.log(`   Exam Entries: ${examEntriesCount}`);
    console.log(`   Exams: ${examsCount}`);
    console.log(`   Results: ${resultsCount}`);
    console.log(`   Payments: ${paymentsCount}`);
    console.log(`   Fee Structures: ${feeStructuresCount}`);
    console.log(`   Timetables: ${timetablesCount}`);
    console.log(`   Student Accounts: ${studentAccountsCount}`);
    console.log('');

    const totalRecords = caEntriesCount + examEntriesCount + examsCount + resultsCount + 
                        paymentsCount + feeStructuresCount + timetablesCount + studentAccountsCount;

    if (totalRecords === 0) {
      console.log('✅ No related data found. Safe to delete.\n');
    } else {
      console.log(`⚠️  Found ${totalRecords} related records that will be deleted.\n`);
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete Term 3 and all related data!');
    console.log('   This action CANNOT be undone.\n');

    // Delete related data first (in correct order to avoid foreign key constraints)
    console.log('🗑️  Starting deletion process...\n');

    let deletedCount = 0;

    // Delete CA entries
    if (caEntriesCount > 0) {
      console.log(`   Deleting ${caEntriesCount} CA entries...`);
      const result = await prisma.cAEntry.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} CA entries`);
    }

    // Delete exam entries
    if (examEntriesCount > 0) {
      console.log(`   Deleting ${examEntriesCount} exam entries...`);
      const result = await prisma.examEntry.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} exam entries`);
    }

    // Delete results
    if (resultsCount > 0) {
      console.log(`   Deleting ${resultsCount} results...`);
      const result = await prisma.result.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} results`);
    }

    // Delete payments
    if (paymentsCount > 0) {
      console.log(`   Deleting ${paymentsCount} payments...`);
      const result = await prisma.payment.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} payments`);
    }

    // Delete fee structures
    if (feeStructuresCount > 0) {
      console.log(`   Deleting ${feeStructuresCount} fee structures...`);
      const result = await prisma.feeStructure.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} fee structures`);
    }

    // Delete timetables
    if (timetablesCount > 0) {
      console.log(`   Deleting ${timetablesCount} timetables...`);
      const result = await prisma.timetableDraft.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} timetables`);
    }

    // Delete student accounts
    if (studentAccountsCount > 0) {
      console.log(`   Deleting ${studentAccountsCount} student accounts...`);
      const result = await prisma.studentAccount.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} student accounts`);
    }

    // Delete exams (must be after results)
    if (examsCount > 0) {
      console.log(`   Deleting ${examsCount} exams...`);
      const result = await prisma.exam.deleteMany({
        where: { termId: term3.id },
      });
      deletedCount += result.count;
      console.log(`   ✅ Deleted ${result.count} exams`);
    }

    // Finally, delete the term itself
    console.log(`\n   Deleting Term 3...`);
    await prisma.term.delete({
      where: { id: term3.id },
    });
    console.log(`   ✅ Deleted Term 3`);

    console.log('\n✅ SUCCESS!');
    console.log(`   Deleted Term 3 and ${deletedCount} related records`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTerm3();
