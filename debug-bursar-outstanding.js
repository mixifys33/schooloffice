// Debug script to check bursar outstanding amount calculation
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugOutstandingAmount() {
  try {
    console.log('=== Debugging Outstanding Amount Calculation ===\n');

    // Get the first school (adjust if you have multiple schools)
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('No school found');
      return;
    }
    console.log(`School: ${school.name} (ID: ${school.id})\n`);

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: school.id,
          isCurrent: true
        },
        isCurrent: true
      },
      include: {
        academicYear: true
      }
    });

    if (!currentTerm) {
      console.log('No current term found');
      return;
    }
    console.log(`Current Term: ${currentTerm.name} (ID: ${currentTerm.id})`);
    console.log(`Academic Year: ${currentTerm.academicYear.name}\n`);

    // Get all active students
    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        status: 'ACTIVE'
      },
      include: {
        payments: {
          where: {
            termId: currentTerm.id,
            status: 'CONFIRMED'
          }
        },
        class: true
      }
    });

    console.log(`Total Active Students: ${students.length}\n`);

    // Get fee structures for the term
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: school.id,
        termId: currentTerm.id,
        isActive: true
      },
      include: {
        class: true
      }
    });

    console.log(`Fee Structures Found: ${feeStructures.length}`);
    feeStructures.forEach(fs => {
      console.log(`  - Class: ${fs.class?.name || 'Unknown'}, Amount: ${fs.totalAmount}`);
    });
    console.log('');

    // Calculate totals
    let totalExpectedFees = 0;
    let totalCollected = 0;
    let studentsWithBalance = 0;
    let totalOutstandingAmount = 0;

    console.log('=== Student-by-Student Breakdown ===\n');

    students.forEach(student => {
      const feeStructure = feeStructures.find(fs => 
        fs.classId === student.classId
      );

      const expectedFee = feeStructure?.totalAmount || 0;
      const paidAmount = student.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = expectedFee - paidAmount;

      totalExpectedFees += expectedFee;
      totalCollected += paidAmount;

      if (balance > 0) {
        studentsWithBalance++;
        totalOutstandingAmount += balance;
        console.log(`${student.firstName} ${student.lastName} (${student.class?.name || 'No Class'})`);
        console.log(`  Expected: ${expectedFee}, Paid: ${paidAmount}, Balance: ${balance}`);
      }
    });

    console.log('\n=== Summary ===');
    console.log(`Total Expected Fees: ${totalExpectedFees}`);
    console.log(`Total Collected: ${totalCollected}`);
    console.log(`Total Outstanding (Expected - Collected): ${totalExpectedFees - totalCollected}`);
    console.log(`Total Outstanding (Sum of Balances): ${totalOutstandingAmount}`);
    console.log(`Students With Balance: ${studentsWithBalance}`);
    console.log(`Collection Rate: ${totalExpectedFees > 0 ? ((totalCollected / totalExpectedFees) * 100).toFixed(2) : 0}%`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugOutstandingAmount();
