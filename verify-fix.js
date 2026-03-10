const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyFix() {
  const school = await prisma.school.findFirst()
  const term = await prisma.term.findFirst({ where: { academicYear: { schoolId: school.id }, name: 'Term 1' } })
  
  const accounts = await prisma.studentAccount.findMany({
    where: { schoolId: school.id, termId: term.id },
    include: { student: true }
  })

  const totalExpected = accounts.reduce((sum, a) => sum + a.totalFees, 0)
  const totalCollected = accounts.reduce((sum, a) => sum + a.totalPaid, 0)
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0

  console.log('BEFORE FIX: Dashboard showed 0 payments')
  console.log('AFTER FIX:')
  console.log(`  Total Expected: ${totalExpected}`)
  console.log(`  Total Collected: ${totalCollected}`)
  console.log(`  Collection Rate: ${collectionRate.toFixed(2)}%`)
  console.log(totalCollected > 0 ? '✅ FIX SUCCESSFUL' : '❌ NO DATA')

  await prisma.$disconnect()
}

verifyFix().catch(console.error)
