const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPayments() {
  try {
    // Get all payments
    const allPayments = await prisma.payment.findMany({
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            schoolId: true
          }
        },
        term: {
          select: {
            name: true,
            isCurrent: true
          }
        }
      }
    });

    console.log('\n=== ALL PAYMENTS ===');
    console.log(`Total payments: ${allPayments.length}`);
    allPayments.forEach(p => {
      console.log(`- ${p.student.firstName} ${p.student.lastName}: ${p.amount} (Status: ${p.status}, Term: ${p.term.name}, Current: ${p.term.isCurrent})`);
    });

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: { isCurrent: true },
      include: {
        academicYear: true
      }
    });

    console.log('\n=== CURRENT TERM ===');
    if (currentTerm) {
      console.log(`Term: ${currentTerm.name} (${currentTerm.academicYear.name})`);
      console.log(`ID: ${currentTerm.id}`);
    } else {
      console.log('No current term found!');
    }

    // Get payments for current term
    if (currentTerm) {
      const currentTermPayments = await prisma.payment.findMany({
        where: {
          termId: currentTerm.id,
          status: 'CONFIRMED'
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      console.log('\n=== PAYMENTS FOR CURRENT TERM (CONFIRMED) ===');
      console.log(`Total: ${currentTermPayments.length}`);
      currentTermPayments.forEach(p => {
        console.log(`- ${p.student.firstName} ${p.student.lastName}: ${p.amount}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPayments();
