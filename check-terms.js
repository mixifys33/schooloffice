const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTerms() {
  try {
    const schoolId = '6991bad3be51462507efc102'; // Havard international
    
    // Get all academic years
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: {
          include: {
            _count: {
              select: { payments: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n=== ACADEMIC YEARS & TERMS ===');
    academicYears.forEach(ay => {
      console.log(`\nAcademic Year: ${ay.name}`);
      console.log(`  isCurrent: ${ay.isCurrent}, isActive: ${ay.isActive}`);
      console.log(`  Terms:`);
      ay.terms.forEach(t => {
        console.log(`    - ${t.name}: isCurrent=${t.isCurrent}, payments=${t._count.payments}`);
        console.log(`      Start: ${t.startDate}, End: ${t.endDate}`);
      });
    });
    
    // Check payments without filtering by term
    const allPayments = await prisma.payment.findMany({
      where: {
        schoolId,
        status: 'CONFIRMED'
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        term: { select: { name: true } }
      }
    });
    
    console.log(`\n=== ALL CONFIRMED PAYMENTS ===`);
    console.log(`Total: ${allPayments.length}`);
    console.log(`Total Amount: UGX ${allPayments.reduce((sum, p) => sum + p.amount, 0)}`);
    allPayments.forEach(p => {
      console.log(`- ${p.student.firstName} ${p.student.lastName}: UGX ${p.amount} (Term: ${p.term?.name || 'NO TERM'})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTerms();
