/**
 * Verify schoolId is populated in Phase 1 models
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifySchoolId() {
  console.log('🔍 Verifying schoolId Population...\n')

  try {
    const school = await prisma.school.findFirst()
    console.log(`School: ${school.name} (${school.code})`)
    console.log(`ID: ${school.id}\n`)

    // Check each model
    const checks = []

    // Guardian
    const guardianTotal = await prisma.guardian.count()
    const guardianWithSchoolId = await prisma.guardian.count({
      where: { schoolId: school.id }
    })
    checks.push({ model: 'Guardian', total: guardianTotal, withSchoolId: guardianWithSchoolId })

    // Term
    const termTotal = await prisma.term.count()
    const termWithSchoolId = await prisma.term.count({
      where: { schoolId: school.id }
    })
    checks.push({ model: 'Term', total: termTotal, withSchoolId: termWithSchoolId })

    // Stream
    const streamTotal = await prisma.stream.count()
    const streamWithSchoolId = await prisma.stream.count({
      where: { schoolId: school.id }
    })
    checks.push({ model: 'Stream', total: streamTotal, withSchoolId: streamWithSchoolId })

    // CAEntry
    const caTotal = await prisma.cAEntry.count()
    const caWithSchoolId = await prisma.cAEntry.count({
      where: { schoolId: school.id }
    })
    checks.push({ model: 'CAEntry', total: caTotal, withSchoolId: caWithSchoolId })

    // ExamEntry
    const examTotal = await prisma.examEntry.count()
    const examWithSchoolId = await prisma.examEntry.count({
      where: { schoolId: school.id }
    })
    checks.push({ model: 'ExamEntry', total: examTotal, withSchoolId: examWithSchoolId })

    console.log('Verification Results:\n')
    checks.forEach(check => {
      const status = check.total === check.withSchoolId ? '✅' : '❌'
      console.log(`${status} ${check.model.padEnd(15)} ${check.withSchoolId}/${check.total} records have schoolId`)
    })

    const allGood = checks.every(c => c.total === c.withSchoolId)
    
    if (allGood) {
      console.log('\n🎉 ALL RECORDS HAVE CORRECT SCHOOLID!\n')
      console.log('Phase 1 migration is 100% successful.')
    } else {
      console.log('\n⚠️ Some records missing schoolId')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifySchoolId()
