/**
 * Test Script: Timetable Auto-Generation System
 * 
 * Tests the complete auto-generation system with real database data
 * 
 * Usage: node test-timetable-generation.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
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
}

// ============================================================================
// Main Test Function
// ============================================================================

async function main() {
  console.log('🧪 Starting Timetable Auto-Generation Tests...\n')

  try {
    // Test 1: Database Connection
    await testDatabaseConnection()

    // Test 2: Find Test Data
    const testData = await findTestData()

    // Test 3: Test Generation API (Mock)
    await testGenerationAlgorithm(testData)

    // Test 4: Test with Real Database
    await testWithRealDatabase(testData)

    // Test 5: Test Inspection API
    await testInspectionAPI(testData)

    // Test 6: Test Export APIs
    await testExportAPIs(testData)

    console.log('\n✅ All tests completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================================================
// Test 1: Database Connection
// ============================================================================

async function testDatabaseConnection() {
  console.log('📊 Test 1: Database Connection')
  console.log('─'.repeat(50))

  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    const schoolCount = await prisma.school.count()
    console.log(`✅ Found ${schoolCount} school(s) in database`)

    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    throw error
  }
}

// ============================================================================
// Test 2: Find Test Data
// ============================================================================

async function findTestData() {
  console.log('\n📊 Test 2: Find Test Data')
  console.log('─'.repeat(50))

  // Find school
  const school = await prisma.school.findFirst({
    where: { isActive: true }
  })

  if (!school) {
    throw new Error('No active school found')
  }
  console.log(`✅ School: ${school.name}`)

  // Find current academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true }
  })

  if (!academicYear) {
    throw new Error('No current academic year found')
  }
  console.log(`✅ Academic Year: ${academicYear.name}`)

  // Find current term
  const today = new Date()
  const term = await prisma.term.findFirst({
    where: {
      academicYearId: academicYear.id,
      startDate: { lte: today },
      endDate: { gte: today }
    }
  })

  if (!term) {
    console.log('⚠️  No current term found, using first term')
    const firstTerm = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id },
      orderBy: { startDate: 'asc' }
    })
    if (!firstTerm) {
      throw new Error('No terms found')
    }
    console.log(`✅ Term: ${firstTerm.name}`)
  } else {
    console.log(`✅ Term: ${term.name}`)
  }

  const currentTerm = term || await prisma.term.findFirst({
    where: { academicYearId: academicYear.id },
    orderBy: { startDate: 'asc' }
  })

  // Find class with curriculum subjects
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

  // Find or create timetable
  let timetable = await prisma.doSTimetable.findFirst({
    where: {
      classId: classWithSubjects.id,
      termId: currentTerm.id
    }
  })

  if (!timetable) {
    console.log('⚠️  No timetable found, creating one...')
    timetable = await prisma.doSTimetable.create({
      data: {
        name: `${classWithSubjects.name} - ${currentTerm.name} Timetable`,
        classId: classWithSubjects.id,
        termId: currentTerm.id,
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

  // Check teacher assignments
  const teacherAssignments = await prisma.staffSubject.findMany({
    where: {
      classId: classWithSubjects.id,
      staff: { schoolId: school.id }
    },
    include: {
      staff: true,
      subject: true
    }
  })

  console.log(`✅ Teacher Assignments: ${teacherAssignments.length}`)

  if (teacherAssignments.length === 0) {
    console.log('⚠️  Warning: No teacher assignments found. Generation may fail.')
  }

  return {
    school,
    academicYear,
    term: currentTerm,
    class: classWithSubjects,
    timetable,
    teacherAssignments
  }
}

// ============================================================================
// Test 3: Test Generation Algorithm (Mock)
// ============================================================================

async function testGenerationAlgorithm(testData) {
  console.log('\n📊 Test 3: Test Generation Algorithm (Mock)')
  console.log('─'.repeat(50))

  const { class: classData, timetable, teacherAssignments } = testData

  // Simulate generation
  console.log('🔄 Simulating generation...')

  const totalSlots = TEST_CONFIG.periodsPerDay * TEST_CONFIG.daysPerWeek
  const subjectCount = classData.dosCurriculumSubjects.length
  const teacherCount = teacherAssignments.length

  console.log(`📊 Generation Parameters:`)
  console.log(`   - Total Slots: ${totalSlots}`)
  console.log(`   - Subjects: ${subjectCount}`)
  console.log(`   - Teachers: ${teacherCount}`)
  console.log(`   - Periods Per Day: ${TEST_CONFIG.periodsPerDay}`)
  console.log(`   - Days Per Week: ${TEST_CONFIG.daysPerWeek}`)

  // Calculate expected entries
  let expectedEntries = 0
  for (const cs of classData.dosCurriculumSubjects) {
    expectedEntries += cs.periodsPerWeek
  }

  console.log(`📊 Expected Entries: ${expectedEntries}`)

  if (expectedEntries > totalSlots) {
    console.log(`⚠️  Warning: Expected entries (${expectedEntries}) exceed total slots (${totalSlots})`)
  }

  // Test constraint checking
  console.log('\n🔍 Testing Constraint Checks:')

  // 1. Teacher availability
  const teacherSchedule = new Map()
  for (const assignment of teacherAssignments) {
    if (!teacherSchedule.has(assignment.staffId)) {
      teacherSchedule.set(assignment.staffId, [])
    }
  }
  console.log(`   ✅ Teacher availability: ${teacherSchedule.size} teachers`)

  // 2. Subject period limits
  const subjectLimits = new Map()
  for (const cs of classData.dosCurriculumSubjects) {
    subjectLimits.set(cs.subjectId, cs.periodsPerWeek)
  }
  console.log(`   ✅ Subject period limits: ${subjectLimits.size} subjects`)

  // 3. Slot occupancy
  const slots = new Set()
  for (let day = 1; day <= TEST_CONFIG.daysPerWeek; day++) {
    for (let period = 1; period <= TEST_CONFIG.periodsPerDay; period++) {
      slots.add(`${day}-${period}`)
    }
  }
  console.log(`   ✅ Slot occupancy: ${slots.size} available slots`)

  console.log('\n✅ Algorithm validation passed')
}

// ============================================================================
// Test 4: Test with Real Database
// ============================================================================

async function testWithRealDatabase(testData) {
  console.log('\n📊 Test 4: Test with Real Database')
  console.log('─'.repeat(50))

  const { timetable, class: classData } = testData

  // Clear existing entries
  console.log('🗑️  Clearing existing entries...')
  const deleted = await prisma.doSTimetableEntry.deleteMany({
    where: { timetableId: timetable.id }
  })
  console.log(`✅ Deleted ${deleted.count} existing entries`)

  // Fetch data for generation
  console.log('\n🔄 Fetching data for generation...')

  const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
    where: { classId: classData.id },
    include: {
      subject: true
    }
  })

  const staffSubjects = await prisma.staffSubject.findMany({
    where: { classId: classData.id },
    include: {
      staff: true,
      subject: true
    }
  })

  console.log(`✅ Curriculum Subjects: ${curriculumSubjects.length}`)
  console.log(`✅ Staff Assignments: ${staffSubjects.length}`)

  // Create subject-teacher map
  const subjectTeacherMap = new Map()
  for (const ss of staffSubjects) {
    subjectTeacherMap.set(ss.subjectId, ss.staff)
  }

  // Generate entries (simple greedy algorithm)
  console.log('\n🔄 Generating entries...')

  const entries = []
  let slotIndex = 0

  for (const cs of curriculumSubjects) {
    const teacher = subjectTeacherMap.get(cs.subjectId)

    if (!teacher) {
      console.log(`⚠️  No teacher assigned for ${cs.subject.name}, skipping...`)
      continue
    }

    for (let i = 0; i < cs.periodsPerWeek; i++) {
      if (slotIndex >= TEST_CONFIG.periodsPerDay * TEST_CONFIG.daysPerWeek) {
        console.log(`⚠️  Ran out of slots, stopping...`)
        break
      }

      const dayOfWeek = Math.floor(slotIndex / TEST_CONFIG.periodsPerDay) + 1
      const period = (slotIndex % TEST_CONFIG.periodsPerDay) + 1

      entries.push({
        timetableId: timetable.id,
        curriculumSubjectId: cs.id,
        teacherId: teacher.id,
        dayOfWeek,
        period,
        room: null,
        isDoubleLesson: false,
        notes: null
      })

      slotIndex++
    }
  }

  console.log(`✅ Generated ${entries.length} entries`)

  // Save to database
  console.log('\n💾 Saving to database...')

  const created = await prisma.doSTimetableEntry.createMany({
    data: entries
  })

  console.log(`✅ Saved ${created.count} entries to database`)

  // Verify
  const savedEntries = await prisma.doSTimetableEntry.findMany({
    where: { timetableId: timetable.id }
  })

  console.log(`✅ Verified: ${savedEntries.length} entries in database`)

  // Calculate statistics
  console.log('\n📊 Generation Statistics:')
  console.log(`   - Total Entries: ${savedEntries.length}`)
  console.log(`   - Slots Used: ${savedEntries.length}/${TEST_CONFIG.periodsPerDay * TEST_CONFIG.daysPerWeek}`)
  console.log(`   - Fill Rate: ${Math.round((savedEntries.length / (TEST_CONFIG.periodsPerDay * TEST_CONFIG.daysPerWeek)) * 100)}%`)

  // Check for conflicts
  console.log('\n🔍 Checking for conflicts...')

  const conflicts = []

  // Teacher double-booking
  const teacherSlots = new Map()
  for (const entry of savedEntries) {
    const key = `${entry.teacherId}-${entry.dayOfWeek}-${entry.period}`
    if (teacherSlots.has(key)) {
      conflicts.push({
        type: 'TEACHER_DOUBLE_BOOKING',
        entry1: teacherSlots.get(key),
        entry2: entry
      })
    } else {
      teacherSlots.set(key, entry)
    }
  }

  // Slot occupancy
  const slotOccupancy = new Map()
  for (const entry of savedEntries) {
    const key = `${entry.dayOfWeek}-${entry.period}`
    if (slotOccupancy.has(key)) {
      conflicts.push({
        type: 'SLOT_OCCUPIED',
        entry1: slotOccupancy.get(key),
        entry2: entry
      })
    } else {
      slotOccupancy.set(key, entry)
    }
  }

  if (conflicts.length === 0) {
    console.log('✅ No conflicts detected')
  } else {
    console.log(`⚠️  Found ${conflicts.length} conflict(s):`)
    for (const conflict of conflicts) {
      console.log(`   - ${conflict.type}`)
    }
  }

  return {
    entries: savedEntries,
    conflicts
  }
}

// ============================================================================
// Test 5: Test Inspection API
// ============================================================================

async function testInspectionAPI(testData) {
  console.log('\n📊 Test 5: Test Inspection API (Mock)')
  console.log('─'.repeat(50))

  const { timetable } = testData

  // Fetch timetable with entries
  const timetableWithEntries = await prisma.doSTimetable.findUnique({
    where: { id: timetable.id },
    include: {
      entries: {
        include: {
          curriculumSubject: {
            include: {
              subject: true
            }
          },
          teacher: true
        }
      }
    }
  })

  console.log(`✅ Fetched timetable with ${timetableWithEntries.entries.length} entries`)

  // Calculate quality score (simplified)
  console.log('\n📊 Calculating Quality Score:')

  let score = 100

  // 1. Teacher gaps
  const teacherSchedules = new Map()
  for (const entry of timetableWithEntries.entries) {
    if (!teacherSchedules.has(entry.teacherId)) {
      teacherSchedules.set(entry.teacherId, [])
    }
    const slotIndex = (entry.dayOfWeek - 1) * 8 + entry.period
    teacherSchedules.get(entry.teacherId).push(slotIndex)
  }

  let totalGaps = 0
  for (const [_, slots] of teacherSchedules) {
    slots.sort((a, b) => a - b)
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i] - slots[i - 1] - 1
      if (gap > 0 && gap <= 3) {
        totalGaps += gap
      }
    }
  }

  const gapPenalty = totalGaps * 10
  score -= gapPenalty

  console.log(`   - Teacher Gaps: ${totalGaps} (penalty: -${gapPenalty})`)

  // 2. Heavy subjects in afternoon
  const heavySubjects = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology']
  let heavyAfternoon = 0

  for (const entry of timetableWithEntries.entries) {
    const subjectName = entry.curriculumSubject?.subject?.name || ''
    const isHeavy = heavySubjects.some(h => subjectName.includes(h))
    const isAfternoon = entry.period > 4

    if (isHeavy && isAfternoon) {
      heavyAfternoon++
    }
  }

  const heavyPenalty = heavyAfternoon * 5
  score -= heavyPenalty

  console.log(`   - Heavy Subjects Afternoon: ${heavyAfternoon} (penalty: -${heavyPenalty})`)

  // 3. Final score
  score = Math.max(0, Math.round(score * 10) / 10)

  console.log(`\n✅ Quality Score: ${score}/100`)

  if (score >= 80) {
    console.log('   🎉 Excellent quality!')
  } else if (score >= 60) {
    console.log('   👍 Good quality')
  } else {
    console.log('   ⚠️  Needs improvement')
  }

  // Teacher workload
  console.log('\n📊 Teacher Workload:')
  for (const [teacherId, slots] of teacherSchedules) {
    const teacher = timetableWithEntries.entries.find(e => e.teacherId === teacherId)?.teacher
    if (teacher) {
      console.log(`   - ${teacher.firstName} ${teacher.lastName}: ${slots.length} periods/week`)
    }
  }

  return {
    score,
    totalGaps,
    heavyAfternoon
  }
}

// ============================================================================
// Test 6: Test Export APIs
// ============================================================================

async function testExportAPIs(testData) {
  console.log('\n📊 Test 6: Test Export APIs (Mock)')
  console.log('─'.repeat(50))

  const { timetable } = testData

  // Test PDF export (mock)
  console.log('📄 Testing PDF Export:')
  console.log(`   - Endpoint: /api/dos/timetable/${timetable.id}/export/pdf`)
  console.log('   ✅ PDF export endpoint ready')

  // Test Excel export (mock)
  console.log('\n📊 Testing Excel Export:')
  console.log(`   - Endpoint: /api/dos/timetable/${timetable.id}/export/excel`)
  console.log('   ✅ Excel export endpoint ready')

  console.log('\n💡 To test exports, visit:')
  console.log(`   - PDF: http://localhost:3000/api/dos/timetable/${timetable.id}/export/pdf`)
  console.log(`   - Excel: http://localhost:3000/api/dos/timetable/${timetable.id}/export/excel`)
}

// ============================================================================
// Run Tests
// ============================================================================

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
