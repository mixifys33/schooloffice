/**
 * Test Script: Generation API End-to-End Test
 * 
 * Tests the actual generation API endpoint with real data
 * 
 * Usage: node test-generation-api.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'http://localhost:3000'

const TEST_CONFIGS = [
  {
    name: 'Default Configuration',
    config: {
      periodsPerDay: 8,
      periodDuration: 40,
      startTime: '08:00',
      daysPerWeek: 5,
      breaks: [
        { afterPeriod: 3, duration: 15, name: 'Break' },
        { afterPeriod: 5, duration: 60, name: 'Lunch' }
      ],
      weights: {
        teacherGaps: 0.8,
        heavySubjectsAfternoon: 0.7,
        workloadBalance: 0.6,
        subjectDistribution: 0.5
      }
    },
    preserveExisting: false,
    clearExisting: true
  },
  {
    name: 'High Quality Configuration',
    config: {
      periodsPerDay: 8,
      periodDuration: 40,
      startTime: '08:00',
      daysPerWeek: 5,
      breaks: [
        { afterPeriod: 3, duration: 15, name: 'Break' },
        { afterPeriod: 5, duration: 60, name: 'Lunch' }
      ],
      weights: {
        teacherGaps: 1.0,
        heavySubjectsAfternoon: 1.0,
        workloadBalance: 0.8,
        subjectDistribution: 0.7
      }
    },
    preserveExisting: false,
    clearExisting: true
  },
  {
    name: 'Preserve Existing Configuration',
    config: {
      periodsPerDay: 8,
      periodDuration: 40,
      startTime: '08:00',
      daysPerWeek: 5,
      breaks: [
        { afterPeriod: 3, duration: 15, name: 'Break' },
        { afterPeriod: 5, duration: 60, name: 'Lunch' }
      ],
      weights: {
        teacherGaps: 0.8,
        heavySubjectsAfternoon: 0.7,
        workloadBalance: 0.6,
        subjectDistribution: 0.5
      }
    },
    preserveExisting: true,
    clearExisting: false
  }
]

// ============================================================================
// Main Test Function
// ============================================================================

async function main() {
  console.log('🧪 Starting Generation API End-to-End Tests...\n')

  try {
    // Step 1: Find test data
    const testData = await findTestData()

    // Step 2: Run generation tests
    for (let i = 0; i < TEST_CONFIGS.length; i++) {
      const testConfig = TEST_CONFIGS[i]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📊 Test ${i + 1}/${TEST_CONFIGS.length}: ${testConfig.name}`)
      console.log('='.repeat(60))

      await testGeneration(testData, testConfig)

      // Wait between tests
      if (i < TEST_CONFIGS.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next test...')
        await sleep(2000)
      }
    }

    // Step 3: Compare results
    await compareResults(testData)

    console.log('\n✅ All API tests completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function findTestData() {
  console.log('📊 Finding Test Data')
  console.log('─'.repeat(50))

  const school = await prisma.school.findFirst({
    where: { isActive: true }
  })

  if (!school) {
    throw new Error('No active school found')
  }
  console.log(`✅ School: ${school.name}`)

  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true }
  })

  if (!academicYear) {
    throw new Error('No current academic year found')
  }

  const today = new Date()
  let term = await prisma.term.findFirst({
    where: {
      academicYearId: academicYear.id,
      startDate: { lte: today },
      endDate: { gte: today }
    }
  })

  if (!term) {
    term = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id },
      orderBy: { startDate: 'asc' }
    })
  }

  if (!term) {
    throw new Error('No terms found')
  }
  console.log(`✅ Term: ${term.name}`)

  const classWithSubjects = await prisma.class.findFirst({
    where: {
      schoolId: school.id,
      dosCurriculumSubjects: {
        some: {}
      }
    },
    include: {
      dosCurriculumSubjects: {
        include: {
          subject: true
        }
      }
    }
  })

  if (!classWithSubjects) {
    throw new Error('No class with curriculum subjects found')
  }
  console.log(`✅ Class: ${classWithSubjects.name} (${classWithSubjects.dosCurriculumSubjects.length} subjects)`)

  let timetable = await prisma.doSTimetable.findFirst({
    where: {
      classId: classWithSubjects.id,
      termId: term.id
    }
  })

  if (!timetable) {
    timetable = await prisma.doSTimetable.create({
      data: {
        name: `${classWithSubjects.name} - ${term.name} Test Timetable`,
        classId: classWithSubjects.id,
        termId: term.id,
        schoolId: school.id,
        status: 'DRAFT',
        isLocked: false,
        dosApproved: false
      }
    })
    console.log(`✅ Created timetable: ${timetable.name}`)
  } else {
    console.log(`✅ Timetable: ${timetable.name}`)
  }

  return {
    school,
    academicYear,
    term,
    class: classWithSubjects,
    timetable
  }
}

async function testGeneration(testData, testConfig) {
  const { timetable } = testData

  console.log('\n🔄 Running Generation Test...')
  console.log(`   Configuration: ${testConfig.name}`)
  console.log(`   Preserve Existing: ${testConfig.preserveExisting}`)
  console.log(`   Clear Existing: ${testConfig.clearExisting}`)

  // Import the generator directly
  const { generateTimetable } = require('./src/lib/timetable-generator')

  try {
    // Fetch required data
    const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
      where: { classId: testData.class.id },
      include: {
        subject: true
      }
    })

    const staffSubjects = await prisma.staffSubject.findMany({
      where: { classId: testData.class.id },
      include: {
        staff: true,
        subject: true
      }
    })

    console.log(`\n📊 Input Data:`)
    console.log(`   - Curriculum Subjects: ${curriculumSubjects.length}`)
    console.log(`   - Staff Assignments: ${staffSubjects.length}`)

    // Get existing entries if preserving
    let existingEntries = []
    if (testConfig.preserveExisting) {
      existingEntries = await prisma.doSTimetableEntry.findMany({
        where: { timetableId: timetable.id },
        include: {
          curriculumSubject: {
            include: {
              subject: true
            }
          },
          teacher: true
        }
      })
      console.log(`   - Existing Entries: ${existingEntries.length}`)
    }

    // Clear if requested
    if (testConfig.clearExisting) {
      const deleted = await prisma.doSTimetableEntry.deleteMany({
        where: { timetableId: timetable.id }
      })
      console.log(`   - Cleared: ${deleted.count} entries`)
    }

    // Run generation
    console.log('\n⚡ Generating timetable...')
    const startTime = Date.now()

    const result = await generateTimetable(
      curriculumSubjects,
      staffSubjects,
      existingEntries,
      testConfig.config
    )

    const duration = Date.now() - startTime

    console.log(`\n✅ Generation completed in ${duration}ms`)

    // Display results
    console.log('\n📊 Generation Results:')
    console.log(`   - Entries Generated: ${result.entries.length}`)
    console.log(`   - Quality Score: ${result.score}/100`)
    console.log(`   - Conflicts: ${result.conflicts.length}`)
    console.log(`   - Suggestions: ${result.suggestions.length}`)

    // Display statistics
    if (result.stats) {
      console.log('\n📈 Statistics:')
      console.log(`   - Total Slots: ${result.stats.totalSlots}`)
      console.log(`   - Filled Slots: ${result.stats.filledSlots}`)
      console.log(`   - Empty Slots: ${result.stats.emptySlots}`)
      console.log(`   - Teacher Gaps: ${result.stats.teacherGaps}`)
      console.log(`   - Heavy Afternoon: ${result.stats.heavyAfternoon}`)
    }

    // Display conflicts
    if (result.conflicts.length > 0) {
      console.log('\n⚠️  Conflicts:')
      for (const conflict of result.conflicts) {
        console.log(`   - ${conflict}`)
      }
    }

    // Display suggestions
    if (result.suggestions.length > 0) {
      console.log('\n💡 Suggestions:')
      for (const suggestion of result.suggestions) {
        console.log(`   - ${suggestion}`)
      }
    }

    // Save to database
    console.log('\n💾 Saving to database...')

    // Clear existing entries first
    await prisma.doSTimetableEntry.deleteMany({
      where: { timetableId: timetable.id }
    })

    // Save new entries
    const entriesToSave = result.entries.map(entry => ({
      timetableId: timetable.id,
      curriculumSubjectId: entry.curriculumSubjectId,
      teacherId: entry.teacherId,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      room: entry.room,
      isDoubleLesson: entry.isDoubleLesson || false,
      notes: entry.notes
    }))

    const created = await prisma.doSTimetableEntry.createMany({
      data: entriesToSave
    })

    console.log(`✅ Saved ${created.count} entries to database`)

    // Verify
    const savedEntries = await prisma.doSTimetableEntry.count({
      where: { timetableId: timetable.id }
    })

    console.log(`✅ Verified: ${savedEntries} entries in database`)

    return {
      config: testConfig,
      result,
      duration,
      savedCount: created.count
    }

  } catch (error) {
    console.error('❌ Generation failed:', error.message)
    console.error(error.stack)
    throw error
  }
}

async function compareResults(testData) {
  console.log('\n📊 Comparing Results')
  console.log('─'.repeat(50))

  const { timetable } = testData

  const entries = await prisma.doSTimetableEntry.findMany({
    where: { timetableId: timetable.id },
    include: {
      curriculumSubject: {
        include: {
          subject: true
        }
      },
      teacher: true
    }
  })

  console.log(`\n📈 Final Timetable Statistics:`)
  console.log(`   - Total Entries: ${entries.length}`)

  // Subject distribution
  const subjectCounts = new Map()
  for (const entry of entries) {
    const subjectName = entry.curriculumSubject.subject.name
    subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1)
  }

  console.log(`\n📚 Subject Distribution:`)
  for (const [subject, count] of subjectCounts) {
    console.log(`   - ${subject}: ${count} periods`)
  }

  // Teacher workload
  const teacherCounts = new Map()
  for (const entry of entries) {
    const teacherName = `${entry.teacher.firstName} ${entry.teacher.lastName}`
    teacherCounts.set(teacherName, (teacherCounts.get(teacherName) || 0) + 1)
  }

  console.log(`\n👥 Teacher Workload:`)
  for (const [teacher, count] of teacherCounts) {
    console.log(`   - ${teacher}: ${count} periods/week`)
  }

  // Daily distribution
  const dailyCounts = [0, 0, 0, 0, 0]
  for (const entry of entries) {
    dailyCounts[entry.dayOfWeek - 1]++
  }

  console.log(`\n📅 Daily Distribution:`)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  for (let i = 0; i < days.length; i++) {
    console.log(`   - ${days[i]}: ${dailyCounts[i]} periods`)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Run Tests
// ============================================================================

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
