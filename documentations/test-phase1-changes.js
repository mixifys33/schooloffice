/**
 * Test Phase 1 Multi-Tenancy Changes
 * 
 * Verifies that all Phase 1 models properly connect to School
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPhase1Changes() {
  console.log('🧪 Testing Phase 1 Multi-Tenancy Changes...\n')

  try {
    // Get the school
    const school = await prisma.school.findFirst({
      select: { id: true, name: true, code: true },
    })

    if (!school) {
      console.log('❌ No school found!')
      return
    }

    console.log(`✅ School: ${school.name} (${school.code})`)
    console.log(`   ID: ${school.id}\n`)

    console.log('═══════════════════════════════════════════════════════════')
    console.log('🔍 TESTING PHASE 1 MODELS')
    console.log('═══════════════════════════════════════════════════════════\n')

    const tests = []

    // Test 1: Guardian
    try {
      const guardians = await prisma.guardian.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'Guardian',
        success: true,
        count: guardians.length,
        hasSchoolId: guardians.length > 0 && guardians[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'Guardian', success: false, error: error.message })
    }

    // Test 2: Term
    try {
      const terms = await prisma.term.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'Term',
        success: true,
        count: terms.length,
        hasSchoolId: terms.length > 0 && terms[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'Term', success: false, error: error.message })
    }

    // Test 3: Stream
    try {
      const streams = await prisma.stream.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'Stream',
        success: true,
        count: streams.length,
        hasSchoolId: streams.length > 0 && streams[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'Stream', success: false, error: error.message })
    }

    // Test 4: Mark
    try {
      const marks = await prisma.mark.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'Mark',
        success: true,
        count: marks.length,
        hasSchoolId: marks.length > 0 && marks[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'Mark', success: false, error: error.message })
    }

    // Test 5: Result
    try {
      const results = await prisma.result.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'Result',
        success: true,
        count: results.length,
        hasSchoolId: results.length > 0 && results[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'Result', success: false, error: error.message })
    }

    // Test 6: Attendance
    try {
      const attendance = await prisma.attendance.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'Attendance',
        success: true,
        count: attendance.length,
        hasSchoolId: attendance.length > 0 && attendance[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'Attendance', success: false, error: error.message })
    }

    // Test 7: CAEntry
    try {
      const caEntries = await prisma.cAEntry.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'CAEntry',
        success: true,
        count: caEntries.length,
        hasSchoolId: caEntries.length > 0 && caEntries[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'CAEntry', success: false, error: error.message })
    }

    // Test 8: ExamEntry
    try {
      const examEntries = await prisma.examEntry.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'ExamEntry',
        success: true,
        count: examEntries.length,
        hasSchoolId: examEntries.length > 0 && examEntries[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'ExamEntry', success: false, error: error.message })
    }

    // Test 9: DisciplineCase
    try {
      const disciplineCases = await prisma.disciplineCase.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'DisciplineCase',
        success: true,
        count: disciplineCases.length,
        hasSchoolId: disciplineCases.length > 0 && disciplineCases[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'DisciplineCase', success: false, error: error.message })
    }

    // Test 10: StudentDocument
    try {
      const studentDocuments = await prisma.studentDocument.findMany({
        where: { schoolId: school.id },
        take: 1,
      })
      tests.push({
        model: 'StudentDocument',
        success: true,
        count: studentDocuments.length,
        hasSchoolId: studentDocuments.length > 0 && studentDocuments[0].schoolId === school.id,
      })
    } catch (error) {
      tests.push({ model: 'StudentDocument', success: false, error: error.message })
    }

    // Display results
    console.log('Test Results:\n')
    tests.forEach((test) => {
      if (test.success) {
        const schoolIdStatus = test.count > 0 
          ? (test.hasSchoolId ? '✅ schoolId correct' : '❌ schoolId mismatch')
          : '⚠️ no records'
        console.log(`✅ ${test.model.padEnd(20)} - Query works (${test.count} records) - ${schoolIdStatus}`)
      } else {
        console.log(`❌ ${test.model.padEnd(20)} - Error: ${test.error}`)
      }
    })

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('📊 SUMMARY')
    console.log('═══════════════════════════════════════════════════════════\n')

    const successful = tests.filter(t => t.success)
    const failed = tests.filter(t => !t.success)
    const withData = tests.filter(t => t.success && t.count > 0 && t.hasSchoolId)

    console.log(`Total Models Tested:     ${tests.length}`)
    console.log(`✅ Queries Successful:   ${successful.length}`)
    console.log(`❌ Queries Failed:       ${failed.length}`)
    console.log(`📊 Models with Data:     ${withData.length}`)

    if (failed.length === 0 && successful.length === 10) {
      console.log('\n🎉 ALL TESTS PASSED! Phase 1 is working correctly.\n')
      return true
    } else {
      console.log('\n⚠️ Some tests failed. Review errors above.\n')
      return false
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
testPhase1Changes()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
