const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStudentAccounts() {
  try {
    console.log('=== Finding Active Term ===\n');
    
    // Find active term
    const activeTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: {
          include: {
            school: true
          }
        }
      }
    });
    
    if (!activeTerm) {
      console.log('⚠️  No active term found. Checking all terms...');
      
      const allTerms = await prisma.term.findMany({
        include: {
          academicYear: true
        },
        take: 5
      });
      
      console.log(`Found ${allTerms.length} terms:`);
      allTerms.forEach(t => {
        console.log(`- ${t.name} (${t.id}) - Academic Year Active: ${t.academicYear.isActive}`);
      });
      
      if (allTerms.length > 0) {
        console.log('\nUsing the first term for account creation...');
        const termToUse = allTerms[0];
        await createAccountsForTerm(termToUse.id);
      }
      return;
    }
    
    console.log(`Active term: ${activeTerm.name} (${activeTerm.id})`);
    console.log(`School: ${activeTerm.academicYear.school.name}\n`);
    
    await createAccountsForTerm(activeTerm.id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createAccountsForTerm(termId) {
  console.log('=== Creating Student Accounts ===\n');
  
  // Get all active students
  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      class: true
    }
  });
  
  console.log(`Found ${students.length} active students\n`);
  
  let created = 0;
  let errors = 0;
  
  for (const student of students) {
    try {
      // Check if account already exists
      const existingAccount = await prisma.studentAccount.findUnique({
        where: {
          studentId_termId: {
            studentId: student.id,
            termId: termId
          }
        }
      });
      
      if (existingAccount) {
        console.log(`✓ Account already exists for ${student.firstName} ${student.lastName}`);
        continue;
      }
      
      // Get fee structure for this student
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId: student.schoolId,
          classId: student.classId,
          termId: termId,
          studentType: 'DAY', // Default to DAY, adjust if needed
          isActive: true
        }
      });
      
      const totalFees = feeStructure?.totalAmount || 0;
      
      // Get total payments for this student and term
      const payments = await prisma.payment.aggregate({
        where: {
          studentId: student.id,
          termId: termId,
          status: 'CONFIRMED'
        },
        _sum: {
          amount: true
        }
      });
      
      const totalPaid = payments._sum.amount || 0;
      
      // Calculate balance
      const balance = totalFees - totalPaid;
      
      // Create student account
      await prisma.studentAccount.create({
        data: {
          studentId: student.id,
          schoolId: student.schoolId,
          termId: termId,
          studentType: 'DAY',
          totalFees: totalFees,
          totalPaid: totalPaid,
          totalDiscounts: 0,
          totalPenalties: 0,
          balance: balance,
          paymentStatus: balance <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID'
        }
      });
      
      console.log(`✓ Created account for ${student.firstName} ${student.lastName}`);
      console.log(`  Total Fees: ${totalFees}, Paid: ${totalPaid}, Balance: ${balance}`);
      created++;
      
    } catch (error) {
      console.error(`✗ Error creating account for ${student.firstName} ${student.lastName}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Created: ${created}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${students.length}`);
}

fixStudentAccounts();
