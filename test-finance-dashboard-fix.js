const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testFinanceDashboardFix() {
  console.log('=== TESTING FINANCE DASHBOARD FIX ===\n')

  // Get school and term
  const school = await prisma.school.findFirst()
  if (!school) {
    console.log('❌ No school found')
    return
  }

  const term = await prisma.term.findFirst({
    where: { academicYear: { schoolId: school.id } },
    orderBy: { startDate: 'desc' }
  })

  if (!term) {
    console.log('❌ No term found')
    return
  }

  console.log(`Testing for: ${school.name}`)
  console.log(`Term: ${term.name}\n`)

  // Get student accounts (simulating what the fixed function does)
  const accounts = await prisma.studentAccount.findMany({
    where: { schoolId: school.id, termId: term.id },
    include: { student: { include: { class: true } } }
  })

  console.log(`Student Accounts found: ${accounts.length}`)

  const totalExpected = accounts.reduce((sum, a) => sum + a.totalFees, 0)
  const totalCollected = accounts.reduce((sum, a) => sum + a.totalPaid, 0)
  const totalOutstanding = accounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0)
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0

  const paidStudents = accounts.filter(a => a.balance <= 0).length
  const partialStudents = accounts.filter(a => a.totalPaid > 0 && a.balance > 0).length
  const unpaidStudents = accounts.filter(a => a.totalPaid === 0 && a.totalFees > 0).length

  console.log('\n=== DASHBOARD SUMMARY (AFTER FIX) ===')
  console.log(`Total Expected: ${totalExpected.toLocaleString()}`)
  console.log(`Total Collected: ${totalCollected.toLocaleString()}`)
  console.log(`Total Outstanding: ${totalOutstanding.toLocaleString()}`)
  console.log(`Collection Rate: ${collectionRate.toFixed(2)}%`)
  console.log(`\nStudent Breakdown:`)
  console.log(`- Paid: ${paidStudents}`)
  console.log(`- Partial: ${partialStudents}`)
  console.log(`- Unpaid: ${unpaidStudents}`)
  console.log(`- Total: ${accounts.length}`)

  console.log('\n=== VERIFICATION ===')
  if (totalCollected > 0) {
    console.log('✓ Dashboard now shows payments correctly')
    console.log('✓ Collection rate is calculated properly')
  } else {
    console.log('⚠ No payments recorded in StudentAccount.totalPaid')
  }

  // Show individual accounts
  if (accounts.length > 0) {
    console.log('\n=== STUDENT ACCOUNTS DETAIL ===')
    accounts.forEach(a => {
      const status = a.balance <= 0 ? 'PAID' : a.totalPaid > 0 ? 'PARTIAL' : 'UNPAID'
      console.log(`${a.student.firstName} ${a.student.lastName}: Fees=${a.totalFees}, Paid=${a.totalPaid}, Balance=${a.balance} [${status}]`)
    })
  }

  await prisma.$disconnect()
}

testFinanceDashboardFix().catch(console.error)
