const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPayments() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        student: true,
        term: true,
      },
    })

    console.log('=== PAYMENT DETAILS ===\n')
    console.log(`Total Payments: ${payments.length}\n`)

    payments.forEach(p => {
      console.log(`Payment ID: ${p.id}`)
      console.log(`Student: ${p.student.firstName} ${p.student.lastName}`)
      console.log(`Amount: UGX ${p.amount}`)
      console.log(`Status: ${p.status}`)
      console.log(`Term ID: ${p.termId}`)
      console.log(`Term Name: ${p.term.name}`)
      console.log(`School ID: ${p.schoolId}`)
      console.log(`Received At: ${p.receivedAt}`)
      console.log('---')
    })

    // Check StudentAccounts
    console.log('\n=== STUDENT ACCOUNTS ===\n')
    const accounts = await prisma.studentAccount.findMany({
      include: {
        student: true,
        term: true,
      },
    })

    accounts.forEach(a => {
      console.log(`Student: ${a.student.firstName} ${a.student.lastName}`)
      console.log(`Term: ${a.term.name}`)
      console.log(`Total Fees: UGX ${a.totalFees}`)
      console.log(`Total Paid: UGX ${a.totalPaid}`)
      console.log(`Balance: UGX ${a.balance}`)
      console.log(`Term ID: ${a.termId}`)
      console.log(`School ID: ${a.schoolId}`)
      console.log('---')
    })

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkPayments()
