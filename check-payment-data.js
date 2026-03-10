const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPaymentData() {
  try {
    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    });
    
    console.log('\n=== SCHOOLS ===');
    console.log(schools);
    
    if (schools.length === 0) {
      console.log('No schools found');
      return;
    }
    
    const schoolId = schools[0].id;
    console.log(`\nUsing school: ${schools[0].name} (${schoolId})`);
    
    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: { schoolId },
        isCurrent: true
      },
      include: { academicYear: true }
    });
    
    console.log('\n=== CURRENT TERM ===');
    console.log(currentTerm);
    
    if (!currentTerm) {
      console.log('No current term found');
      return;
    }
    
    // Check payments
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        status: 'CONFIRMED'
      },
      include: {
        student: {
          select: { firstName: true, lastName: true, admissionNumber: true }
        }
      }
    });
    
    console.log(`\n=== PAYMENTS FOR TERM ${currentTerm.name} ===`);
    console.log(`Total payments: ${payments.length}`);
    console.log(`Total amount: UGX ${payments.reduce((sum, p) => sum + p.amount, 0)}`);
    payments.forEach(p => {
      console.log(`- ${p.student.firstName} ${p.student.lastName} (${p.student.admissionNumber}): UGX ${p.amount} [${p.status}]`);
    });
    
    // Check student accounts
    const studentAccounts = await prisma.studentAccount.findMany({
      where: {
        schoolId,
        termId: currentTerm.id
      },
      include: {
        student: {
          select: { firstName: true, lastName: true, admissionNumber: true }
        }
      }
    });
    
    console.log(`\n=== STUDENT ACCOUNTS FOR TERM ${currentTerm.name} ===`);
    console.log(`Total accounts: ${studentAccounts.length}`);
    studentAccounts.forEach(a => {
      console.log(`- ${a.student.firstName} ${a.student.lastName}: Fees=${a.totalFees}, Paid=${a.totalPaid}, Balance=${a.balance}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentData();
