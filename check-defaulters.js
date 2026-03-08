const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDefaulters() {
  try {
    console.log('=== Checking Student Accounts with Balances ===\n');
    
    // Check all student accounts
    const allAccounts = await prisma.studentAccount.findMany({
      select: {
        id: true,
        studentId: true,
        termId: true,
        balance: true,
        totalFees: true,
        totalPaid: true,
        totalDiscounts: true,
        totalPenalties: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            classId: true
          }
        }
      },
      take: 20
    });
    
    console.log(`Total accounts found: ${allAccounts.length}\n`);
    
    // Check accounts with positive balance
    const accountsWithBalance = allAccounts.filter(acc => acc.balance > 0);
    console.log(`Accounts with balance > 0: ${accountsWithBalance.length}\n`);
    
    if (accountsWithBalance.length > 0) {
      console.log('Top 5 accounts with outstanding balances:');
      accountsWithBalance.slice(0, 5).forEach(acc => {
        console.log(`- ${acc.student.firstName} ${acc.student.lastName}`);
        console.log(`  Balance: ${acc.balance}`);
        console.log(`  Total Fees: ${acc.totalFees}`);
        console.log(`  Total Paid: ${acc.totalPaid}`);
        console.log(`  Discounts: ${acc.totalDiscounts}`);
        console.log(`  Penalties: ${acc.totalPenalties}`);
        console.log(`  Term ID: ${acc.termId}\n`);
      });
    }
    
    // Check if balance field is being calculated correctly
    console.log('\n=== Checking Balance Calculation ===');
    allAccounts.slice(0, 5).forEach(acc => {
      const calculatedBalance = acc.totalFees - acc.totalPaid - acc.totalDiscounts + acc.totalPenalties;
      const storedBalance = acc.balance;
      const match = Math.abs(calculatedBalance - storedBalance) < 0.01;
      
      console.log(`${acc.student.firstName} ${acc.student.lastName}:`);
      console.log(`  Calculated: ${calculatedBalance}`);
      console.log(`  Stored: ${storedBalance}`);
      console.log(`  Match: ${match ? '✓' : '✗'}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDefaulters();
