const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPaymentDataMismatch() {
  console.log('=== PAYMENT DATA MISMATCH CHECK ===\n')

  // Check Payment records
  const payments = await prisma.payment.findMany({
    include: { student: true }
  })
  console.log(`Payment records in database: ${payments.length}`)
  
  if (payments.length > 0) {
    console.log('\nSample payments:')
    payments.slice(0, 5).forEach(p => {
      console.log(`- ${p.student.firstName} ${p.student.lastName}: ${p.amount} (${p.status})`)
    })
  }

  // Check StudentAccount records with totalPaid > 0
  const accountsWithPayments = await prisma.studentAccount.findMany({
    where: { totalPaid: { gt: 0 } },
    include: { student: true, term: true }
  })
  
  console.log(`\nStudentAccount records with totalPaid > 0: ${accountsWithPayments.length}`)
  
  if (accountsWithPayments.length > 0) {
    console.log('\nAccounts showing payments:')
    accountsWithPayments.forEach(a => {
      console.log(`- ${a.student.firstName} ${a.student.lastName} (${a.term.name}): totalPaid=${a.totalPaid}, totalFees=${a.totalFees}, balance=${a.balance}`)
    })
  }

  // Check for mismatch
  console.log('\n=== MISMATCH ANALYSIS ===')
  if (accountsWithPayments.length > 0 && payments.length === 0) {
    console.log('❌ MISMATCH DETECTED: StudentAccount shows payments but Payment table is empty')
    console.log('   This explains why the dashboard shows "No payments recorded"')
  } else if (payments.length > 0) {
    console.log('✓ Payment records exist in database')
  }

  await prisma.$disconnect()
}

checkPaymentDataMismatch().catch(console.error)
