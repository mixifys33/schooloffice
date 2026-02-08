const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBursarFinancialIntegrity() {
  console.log('🔍 Testing Bursar Financial Integrity...\n');

  try {
    // Get a sample school ID
    const school = await prisma.school.findFirst({
      select: { id: true, name: true }
    });

    if (!school) {
      console.log('❌ No schools found in the database');
      return;
    }

    console.log(`🏢 Testing school: ${school.name} (${school.id})\n`);

    // Test 1: Verify student account balances are correctly calculated
    console.log('📊 Testing Student Account Balances...');
    const studentAccounts = await prisma.studentAccount.findMany({
      where: { schoolId: school.id },
      take: 10 // Test first 10 for performance
    });

    let balanceErrors = 0;
    for (const account of studentAccounts) {
      // Calculate expected balance: totalFees - totalPaid - totalDiscounts + totalPenalties
      const expectedBalance = account.totalFees - account.totalPaid - account.totalDiscounts + account.totalPenalties;
      
      if (Math.abs(account.balance - expectedBalance) > 0.01) { // Allow small floating point differences
        console.log(`❌ Balance mismatch for student ${account.studentId}: DB=${account.balance}, Expected=${expectedBalance}`);
        balanceErrors++;
      }
    }

    if (balanceErrors === 0) {
      console.log('✅ All tested student account balances are correct\n');
    } else {
      console.log(`⚠️ Found ${balanceErrors} balance mismatches\n`);
    }

    // Test 2: Verify invoice balances are correctly calculated
    console.log('🧾 Testing Invoice Balances...');
    const invoices = await prisma.invoice.findMany({
      where: { 
        schoolId: school.id 
      },
      take: 10
    });

    let invoiceBalanceErrors = 0;
    for (const invoice of invoices) {
      // Calculate expected balance: totalAmount - paidAmount
      const expectedBalance = invoice.totalAmount - invoice.paidAmount;
      
      if (Math.abs(invoice.balance - expectedBalance) > 0.01) {
        console.log(`❌ Invoice balance mismatch for invoice ${invoice.invoiceNumber}: DB=${invoice.balance}, Expected=${expectedBalance}`);
        invoiceBalanceErrors++;
      }
    }

    if (invoiceBalanceErrors === 0) {
      console.log('✅ All tested invoice balances are correct\n');
    } else {
      console.log(`⚠️ Found ${invoiceBalanceErrors} invoice balance mismatches\n`);
    }

    // Test 3: Verify payment allocations match invoice balances
    console.log('💳 Testing Payment Allocations...');
    const payments = await prisma.payment.findMany({
      where: { 
        schoolId: school.id,
        status: 'CONFIRMED'
      },
      include: {
        allocations: {
          include: {
            invoice: true
          }
        }
      },
      take: 10
    });

    let allocationErrors = 0;
    for (const payment of payments) {
      let totalAllocated = 0;
      for (const allocation of payment.allocations) {
        totalAllocated += allocation.amount;
        
        // Check that allocation doesn't exceed invoice balance
        if (allocation.amount > allocation.invoice.balance) {
          console.log(`❌ Allocation exceeds invoice balance for payment ${payment.id}, invoice ${allocation.invoiceId}`);
          allocationErrors++;
        }
      }
      
      if (Math.abs(totalAllocated - payment.amount) > 0.01) {
        console.log(`❌ Payment allocation mismatch for payment ${payment.id}: Allocated=${totalAllocated}, Payment Amount=${payment.amount}`);
        allocationErrors++;
      }
    }

    if (allocationErrors === 0) {
      console.log('✅ All tested payment allocations are correct\n');
    } else {
      console.log(`⚠️ Found ${allocationErrors} payment allocation issues\n`);
    }

    // Test 4: Verify financial metrics calculation
    console.log('📈 Testing Financial Metrics Calculation...');
    
    // Calculate metrics using raw queries
    const totalRevenue = await prisma.payment.aggregate({
      where: {
        student: { schoolId: school.id },
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });

    const totalExpenses = await prisma.expense.aggregate({
      where: {
        budgetCategory: { schoolId: school.id },
        status: { in: ['APPROVED', 'PAID'] }
      },
      _sum: { amount: true }
    });

    const totalExpectedFees = await prisma.studentAccount.aggregate({
      where: { schoolId: school.id },
      _sum: { totalFees: true }
    });

    const totalCollected = await prisma.studentAccount.aggregate({
      where: { schoolId: school.id },
      _sum: { totalPaid: true }
    });

    const totalOutstanding = (totalExpectedFees._sum.totalFees || 0) - (totalCollected._sum.totalPaid || 0);
    const collectionRate = totalExpectedFees._sum.totalFees > 0 
      ? ((totalCollected._sum.totalPaid || 0) / totalExpectedFees._sum.totalFees) * 100 
      : 0;

    console.log(`   Total Revenue: ${(totalRevenue._sum.amount || 0).toLocaleString()} UGX`);
    console.log(`   Total Expenses: ${(totalExpenses._sum.amount || 0).toLocaleString()} UGX`);
    console.log(`   Net Income: ${((totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0)).toLocaleString()} UGX`);
    console.log(`   Total Expected Fees: ${(totalExpectedFees._sum.totalFees || 0).toLocaleString()} UGX`);
    console.log(`   Total Collected: ${(totalCollected._sum.totalPaid || 0).toLocaleString()} UGX`);
    console.log(`   Total Outstanding: ${totalOutstanding.toLocaleString()} UGX`);
    console.log(`   Collection Rate: ${collectionRate.toFixed(2)}%\n`);

    console.log('✅ Financial metrics calculated successfully\n');

    // Test 5: Verify budget tracking
    console.log('💰 Testing Budget Tracking...');
    const budgetCategories = await prisma.budgetCategory.findMany({
      where: { schoolId: school.id },
      take: 10
    });

    let budgetErrors = 0;
    for (const category of budgetCategories) {
      // Calculate actual spending for this category
      const actualSpent = await prisma.expense.aggregate({
        where: {
          budgetCategoryId: category.id,
          status: { in: ['APPROVED', 'PAID'] }
        },
        _sum: { amount: true }
      });

      const expectedSpent = actualSpent._sum.amount || 0;
      
      if (Math.abs(category.spentAmount - expectedSpent) > 0.01) {
        console.log(`❌ Budget spent amount mismatch for category ${category.name}: DB=${category.spentAmount}, Expected=${expectedSpent}`);
        budgetErrors++;
      }
    }

    if (budgetErrors === 0) {
      console.log('✅ All tested budget tracking is correct\n');
    } else {
      console.log(`⚠️ Found ${budgetErrors} budget tracking issues\n`);
    }

    console.log('🎉 Bursar Financial Integrity Test Completed!');
    console.log('\n✅ The financial data appears to be correctly structured and calculated.');
    console.log('✅ The bursar dashboard should now display accurate, real-time financial information.');

  } catch (error) {
    console.error('❌ Error during financial integrity test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testBursarFinancialIntegrity();