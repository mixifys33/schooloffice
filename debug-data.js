const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugData() {
  try {
    // Check terms
    const allTerms = await prisma.term.findMany({
      include: {
        academicYear: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== ALL TERMS ===');
    console.log(`Total terms: ${allTerms.length}`);
    allTerms.forEach(t => {
      console.log(`- ${t.name} (${t.academicYear.name}) - isCurrent: ${t.isCurrent}, ID: ${t.id}`);
    });

    // Check payments with all statuses
    const allPayments = await prisma.payment.findMany({
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('\n=== ALL PAYMENTS (ANY STATUS) ===');
    console.log(`Total payments: ${allPayments.length}`);
    allPayments.forEach(p => {
      console.log(`- ${p.student.firstName} ${p.student.lastName}: ${p.amount} (Status: ${p.status}, TermID: ${p.termId})`);
    });

    // Check if there's a StudentAccount table
    const studentAccounts = await prisma.studentAccount.findMany({
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        term: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\n=== STUDENT ACCOUNTS ===');
    console.log(`Total accounts: ${studentAccounts.length}`);
    studentAccounts.forEach(a => {
      console.log(`- ${a.student.firstName} ${a.student.lastName} (${a.term.name}): Expected: ${a.totalExpected}, Paid: ${a.totalPaid}, Balance: ${a.balance}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugData();
