// Test the payment status logic with actual data

const testCases = [
  {
    name: 'dawn Amelia',
    amountRequired: 360000,
    amountPaid: 340000,
    balance: 20000,
    expectedStatus: 'PARTIAL',
    expectedOutstanding: 20000,
  },
  {
    name: 'Biira Amelia',
    amountRequired: 360000,
    amountPaid: 410000,
    balance: -50000,
    expectedStatus: 'PAID',
    expectedOutstanding: 0, // Overpaid should not count in outstanding
  },
  {
    name: 'Unpaid Student',
    amountRequired: 360000,
    amountPaid: 0,
    balance: 360000,
    expectedStatus: 'NOT_PAID',
    expectedOutstanding: 360000,
  },
  {
    name: 'Fully Paid Student',
    amountRequired: 360000,
    amountPaid: 360000,
    balance: 0,
    expectedStatus: 'PAID',
    expectedOutstanding: 0,
  },
]

function calculatePaymentStatus(amountRequired, amountPaid, balance) {
  let paymentStatus = 'NOT_PAID'
  
  // Determine payment status based on balance and amount paid
  if (balance <= 0 && amountRequired > 0) {
    // Paid in full or overpaid
    paymentStatus = 'PAID'
  } else if (amountPaid > 0 && balance > 0) {
    // Partially paid (has paid something but still owes)
    paymentStatus = 'PARTIAL'
  } else if (amountPaid === 0 && amountRequired > 0) {
    // Not paid at all
    paymentStatus = 'NOT_PAID'
  } else if (amountRequired === 0) {
    // No fees assigned yet
    paymentStatus = 'PAID'
  }
  
  return paymentStatus
}

function calculateOutstanding(balance) {
  // Only count positive balances (money owed), exclude overpaid amounts
  return Math.max(0, balance)
}

console.log('=== PAYMENT STATUS LOGIC TEST ===\n')

let allPassed = true

testCases.forEach(test => {
  const actualStatus = calculatePaymentStatus(test.amountRequired, test.amountPaid, test.balance)
  const actualOutstanding = calculateOutstanding(test.balance)
  
  const statusMatch = actualStatus === test.expectedStatus
  const outstandingMatch = actualOutstanding === test.expectedOutstanding
  
  console.log(`Test: ${test.name}`)
  console.log(`  Amount Required: UGX ${test.amountRequired.toLocaleString()}`)
  console.log(`  Amount Paid: UGX ${test.amountPaid.toLocaleString()}`)
  console.log(`  Balance: UGX ${test.balance.toLocaleString()}`)
  console.log(`  Expected Status: ${test.expectedStatus} | Actual: ${actualStatus} ${statusMatch ? '✅' : '❌'}`)
  console.log(`  Expected Outstanding: UGX ${test.expectedOutstanding.toLocaleString()} | Actual: UGX ${actualOutstanding.toLocaleString()} ${outstandingMatch ? '✅' : '❌'}`)
  console.log()
  
  if (!statusMatch || !outstandingMatch) {
    allPassed = false
  }
})

// Test summary calculation
console.log('=== SUMMARY CALCULATION TEST ===\n')

const students = testCases.map(t => ({
  ...t,
  paymentStatus: calculatePaymentStatus(t.amountRequired, t.amountPaid, t.balance),
}))

const summary = {
  totalStudents: students.length,
  paidStudents: students.filter(s => s.paymentStatus === 'PAID').length,
  unpaidStudents: students.filter(s => s.paymentStatus === 'NOT_PAID').length,
  partialStudents: students.filter(s => s.paymentStatus === 'PARTIAL').length,
  totalExpected: students.reduce((sum, s) => sum + s.amountRequired, 0),
  totalCollected: students.reduce((sum, s) => sum + s.amountPaid, 0),
  totalOutstanding: students.reduce((sum, s) => sum + Math.max(0, s.balance), 0),
}

console.log(`Total Students: ${summary.totalStudents}`)
console.log(`Paid Students: ${summary.paidStudents} (should be 2)`)
console.log(`Unpaid Students: ${summary.unpaidStudents} (should be 1)`)
console.log(`Partial Students: ${summary.partialStudents} (should be 1)`)
console.log(`Total Expected: UGX ${summary.totalExpected.toLocaleString()}`)
console.log(`Total Collected: UGX ${summary.totalCollected.toLocaleString()}`)
console.log(`Total Outstanding: UGX ${summary.totalOutstanding.toLocaleString()} (should be 380,000 - excludes overpaid)`)
console.log()

if (allPassed) {
  console.log('✅ ALL TESTS PASSED!')
} else {
  console.log('❌ SOME TESTS FAILED!')
  process.exit(1)
}
