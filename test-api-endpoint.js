const { PrismaClient } = require('@prisma/client')
const { getFinanceDashboardSummary } = require('./src/services/finance.service')

const prisma = new PrismaClient()

async function testAPIEndpoint() {
  console.log('=== TESTING FINANCE API ENDPOINT ===\n')

  try {
    // Get school
    const school = await prisma.school.findFirst()
    if (!school) {
      console.log('❌ No school found')
      return
    }

    console.log(`Testing for school: ${school.name}`)
    console.log(`School ID: ${school.id}\n`)

    // Call the actual service function (same as API uses)
    const summary = await getFinanceDashboardSummary(school.id)

    console.log('=== API RESPONSE ===')
    console.log(JSON.stringify(summary, null, 2))

    console.log('\n=== VERIFICATION ===')
    if (summary.totalCollected > 0) {
      console.log('✅ SUCCESS: API returns payment data correctly')
      console.log(`✅ Total Collected: ${summary.totalCollected.toLocaleString()}`)
      console.log(`✅ Collection Rate: ${summary.collectionRate.toFixed(2)}%`)
      console.log(`✅ Total Students: ${summary.totalStudents}`)
      console.log(`✅ Paid Students: ${summary.paidStudents}`)
      console.log(`✅ Partial Students: ${summary.partialStudents}`)
      console.log(`✅ Unpaid Students: ${summary.unpaidStudents}`)
    } else {
      console.log('⚠️  No payments in current term')
      console.log(`   Total Students: ${summary.totalStudents}`)
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIEndpoint()
