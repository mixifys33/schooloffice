const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllPayments() {
  try {
    const schoolId = '6991bad3be51462507efc102';
    
    // Check ALL payments regardless of status
    const allPayments = await prisma.payment.findMany({
      where: { schoolId },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });
    
    console.log(`\n=== ALL PAYMENTS (ANY STATUS) ===`);
    console.log(`Total: ${allPayments.length}`);
    
    const byStatus = {};
    allPayments.forEach(p => {
      if (!byStatus[p.status]) byStatus[p.status] = [];
      byStatus[p.status].push(p);
    });
    
    Object.keys(byStatus).forEach(status => {
      const payments = byStatus[status];
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      console.log(`\n${status}: ${payments.length} payments, Total: UGX ${total}`);
      payments.forEach(p => {
        console.log(`  - ${p.student.firstName} ${p.student.lastName} (${p.student.admissionNumber}): UGX ${p.amount}`);
        console.log(`    Term: ${p.term?.name || 'NO TERM'}, Date: ${p.receivedAt}`);
      });
    });
    
    // Also check student accounts
    const studentAccounts = await prisma.studentAccount.findMany({
      where: { schoolId },
      include: {
        student: { select: { firstName: true, lastName: true } },
        term: { select: { name: true } }
      }
    });
    
    console.log(`\n=== STUDENT ACCOUNTS ===`);
    console.log(`Total: ${studentAccounts.length}`);
    studentAccounts.forEach(a => {
      if (a.totalPaid > 0) {
        console.log(`- ${a.student.firstName} ${a.student.lastName} (${a.term.name}): Paid=${a.totalPaid}, Fees=${a.totalFees}, Balance=${a.balance}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllPayments();
