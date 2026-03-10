const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBursarFix() {
  try {
    const schoolId = '6991bad3be51462507efc102';
    
    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: { schoolId },
        isCurrent: true
      },
      include: { academicYear: true }
    });
    
    console.log('\n=== CURRENT TERM ===');
    console.log(`Term: ${currentTerm?.name}`);
    console.log(`Term ID: ${currentTerm?.id}`);
    
    if (!currentTerm) {
      console.log('No current term found');
      return;
    }
    
    // Get student accounts for current term (what bursar dashboard should show)
    const studentAccounts = await prisma.studentAccount.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        balance: { gt: 0 }
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
            class: { select: { name: true } }
          }
        }
      },
      orderBy: { balance: 'desc' }
    });
    
    console.log(`\n=== TOP DEFAULTERS (TERM ${currentTerm.name}) ===`);
    console.log(`Total students with balance: ${studentAccounts.length}`);
    console.log(`Total outstanding: UGX ${studentAccounts.reduce((sum, a) => sum + a.balance, 0)}`);
    
    studentAccounts.forEach((account, index) => {
      console.log(`\n${index + 1}. ${account.student.firstName} ${account.student.lastName} (${account.student.admissionNumber})`);
      console.log(`   Class: ${account.student.class?.name || 'N/A'}`);
      console.log(`   Total Fees: UGX ${account.totalFees}`);
      console.log(`   Total Paid: UGX ${account.totalPaid}`);
      console.log(`   Balance: UGX ${account.balance}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBursarFix();
