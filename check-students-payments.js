const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== Checking Students ===\n');
    
    const students = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        classId: true
      },
      take: 10
    });
    
    console.log(`Total active students: ${students.length}\n`);
    
    if (students.length > 0) {
      console.log('Sample students:');
      students.slice(0, 5).forEach(s => {
        console.log(`- ${s.firstName} ${s.lastName} (${s.admissionNumber})`);
      });
    }
    
    console.log('\n=== Checking Payments ===\n');
    
    const payments = await prisma.payment.findMany({
      where: { status: 'CONFIRMED' },
      select: {
        id: true,
        amount: true,
        studentId: true,
        termId: true,
        receivedAt: true,
        student: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      take: 10
    });
    
    console.log(`Total confirmed payments: ${payments.length}\n`);
    
    if (payments.length > 0) {
      console.log('Sample payments:');
      payments.slice(0, 5).forEach(p => {
        console.log(`- ${p.student.firstName} ${p.student.lastName}: ${p.amount} (Term: ${p.termId})`);
      });
    }
    
    console.log('\n=== Checking Fee Structures ===\n');
    
    const feeStructures = await prisma.feeStructure.findMany({
      where: { isActive: true },
      select: {
        id: true,
        totalAmount: true,
        termId: true,
        classId: true,
        studentType: true
      },
      take: 10
    });
    
    console.log(`Total active fee structures: ${feeStructures.length}\n`);
    
    if (feeStructures.length > 0) {
      console.log('Sample fee structures:');
      feeStructures.slice(0, 5).forEach(f => {
        console.log(`- Class: ${f.classId}, Type: ${f.studentType}, Amount: ${f.totalAmount}, Term: ${f.termId}`);
      });
    }
    
    console.log('\n=== Checking Student Accounts ===\n');
    
    const studentAccounts = await prisma.studentAccount.count();
    console.log(`Total student accounts: ${studentAccounts}`);
    
    if (studentAccounts === 0) {
      console.log('\n⚠️  ISSUE FOUND: No student accounts exist!');
      console.log('Student accounts need to be created to track balances.');
      console.log('This is why the Top Defaulters component shows "No outstanding balances".');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
