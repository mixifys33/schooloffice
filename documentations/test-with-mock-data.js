/**
 * Test Script: Generation with Mock Data
 * 
 * Tests the generation algorithm with controlled mock data
 * 
 * Usage: node test-with-mock-data.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ============================================================================
// Mock Data Scenarios
// ============================================================================

const MOCK_SCENARIOS = [
  {
    name: 'Small Class (5 subjects, 3 teachers)',
    subjects: [
      { name: 'Mathematics', code: 'MATH', periodsPerWeek: 5, isHeavy: true },
      { name: 'English', code: 'ENG', periodsPerWeek: 5, isHeavy: false },
      { name: 'Science', code: 'SCI', periodsPerWeek: 4, isHeavy: true },
      { name: 'Social Studies', code: 'SST', periodsPerWeek: 3, isHeavy: false },
      { name: 'Physical Education', code: 'PE', periodsPerWeek: 2, isHeavy: false }
    ],
    teachers: [
      { name: 'John Doe', employeeNumber: 'T001' },
      { name: 'Jane Smith', employeeNumber: 'T002' },
      { name: 'Bob Johnson', employeeNumber: 'T003' }
    ],
    assignments: [
      { subjectIndex: 0, teacherIndex: 0 }, // Math -> John
      { subjectIndex: 1, teacherIndex: 1 }, // English -> Jane
      { subjectIndex: 2, teacherIndex: 0 }, // Science -> John
      { subjectIndex: 3, teacherIndex: 2 }, // SST -> Bob
      { subjectIndex: 4, teacherIndex: 2 }  // PE -> Bob
    ]
  },
  {
    name: 'Medium Class (8 subjects, 5 teachers)',
    subjects: [
      { name: 'Mathematics', code: 'MATH', periodsPerWeek: 5, isHeavy: true },
      { name: 'English', code: 'ENG', periodsPerWeek: 5, isHeavy: false },
      { name: 'Science', code: 'SCI', periodsPerWeek: 4, isHeavy: true },
      { name: 'Social Studies', code: 'SST', periodsPerWeek: 4, isHeavy: false },
      { name: 'Religious Education', code: 'RE', periodsPerWeek: 2, isHeavy: false },
      { name: 'Physical Education', code: 'PE', periodsPerWeek: 2, isHeavy: false },
      { name: 'Art', code: 'ART', periodsPerWeek: 2, isHeavy: false },
      { name: 'Music', code: 'MUS', periodsPerWeek: 2, isHeavy: false }
    ],
    teachers: [
      { name: 'John Doe', employeeNumber: 'T001' },
      { name: 'Jane Smith', employeeNumber: 'T002' },
      { name: 'Bob Johnson', employeeNumber: 'T003' },
      { name: 'Alice Brown', employeeNumber: 'T004' },
      { name: 'Charlie Wilson', employeeNumber: 'T005' }
    ],
    assignments: [
      { subjectIndex: 0, teacherIndex: 0 }, // Math -> John
      { subjectIndex: 1, teacherIndex: 1 }, // English -> Jane
      { subjectIndex: 2, teacherIndex: 0 }, // Science -> John
      { subjectIndex: 3, teacherIndex: 2 }, // SST -> Bob
      { subjectIndex: 4, teacherIndex: 3 }, // RE -> Alice
      { subjectIndex: 5, teacherIndex: 2 }, // PE -> Bob
      { subjectIndex: 6, teacherIndex: 4 }, // Art -> Charlie
      { subjectIndex: 7, teacherIndex: 4 }  // Music -> Charlie
    ]
  },
  {
    name: 'Large Class (12 subjects, 8 teachers)',
    subjects: [
      { name: 'Mathematics', code: 'MATH', periodsPerWeek: 6, isHeavy: true },
      { name: 'English', code: 'ENG', periodsPerWeek: 6, isHeavy: false },
      { name: 'Physics', code: 'PHY', periodsPerWeek: 4, isHeavy: true },
      { name: 'Chemistry', code: 'CHEM', periodsPerWeek: 4, isHeavy: true },
      { name: 'Biology', code: 'BIO', periodsPerWeek: 4, isHeavy: true },
      { name: 'History', code: 'HIST', periodsPerWeek: 3, isHeavy: false },
      { name: 'Geography', code: 'GEO', periodsPerWeek: 3, isHeavy: false },
      { name: 'Religious Education', code: 'RE', periodsPerWeek: 2, isHeavy: false },
      { name: 'Physical Education', code: 'PE', periodsPerWeek: 2, isHeavy: false },
      { name: 'Art', code: 'ART', periodsPerWeek: 2, isHeavy: false },
      { name: 'Music', code: 'MUS', periodsPerWeek: 2, isHeavy: false },
      { name: 'Computer Science', code: 'CS', periodsPerWeek: 2, isHeavy: false }
    ],
    teachers: [
      { name: 'John Doe', employeeNumber: 'T001' },
      { name: 'Jane Smith', employeeNumber: 'T002' },
      { name: 'Bob Johnson', employeeNumber: 'T003' },
      { name: 'Alice Brown', employeeNumber: 'T004' },
      { name: 'Charlie Wilson', employeeNumber: 'T005' },
      { name: 'David Lee', employeeNumber: 'T006' },
      { name: 'Emma Davis', employeeNumber: 'T007' },
      { name: 'Frank Miller', employeeNumber: 'T008' }
    ],
    assignments: [
      { subjectIndex: 0, teacherIndex: 0 },  // Math -> John
      { subjectIndex: 1, teacherIndex: 1 },  // English -> Jane
      { subjectIndex: 2, teacherIndex: 2 },  // Physics -> Bob
      { subjectIndex: 3, teacherIndex: 3 },  // Chemistry -> Alice
      { subjectIndex: 4, teacherIndex: 4 },  // Biology -> Charlie
      { subjectIndex: 5, teacherIndex: 5 },  // History -> David
      { subjectIndex: 6, teacherIndex: 5 },  // Geography -> David
      { subjectIndex: 7, teacherIndex: 6 },  // RE -> Emma
      { subjectIndex: 8, teacherIndex: 7 },  // PE -> Frank
      { subjectIndex: 9, teacherIndex: 6 },  // Art -> Emma
      { subjectIndex: 10, teacherIndex: 6 }, // Music -> Emma
      { subjectIndex: 11, teacherIndex: 7 }  // CS -> Frank
    ]
  },
  {
    name: 'Overloaded Class (10 subjects, 45 periods)',
    subjects: [
      { name: 'Mathematics', code: 'MATH', periodsPerWeek: 6, isHeavy: true },
      { name: 'English', code: 'ENG', periodsPerWeek: 6, isHeavy: false },
      { name: 'Science', code: 'SCI', periodsPerWeek: 5, isHeavy: true },
      { name: 'Social Studies', code: 'SST', periodsPerWeek: 5, isHeavy: false },
      { name: 'Religious Education', code: 'RE', periodsPerWeek: 4, isHeavy: false },
      { name: 'Physical Education', code: 'PE', periodsPerWeek: 4, isHeavy: false },
      { name: 'Art', code: 'ART', periodsPerWeek: 4, isHeavy: false },
      { name: 'Music', code: 'MUS', periodsPerWeek: 4, isHeavy: false },
      { name: 'Computer Science', code: 'CS', periodsPerWeek: 4, isHeavy: false },
      { name: 'Life Skills', code: 'LS', periodsPerWeek: 3, isHeavy: false }
    ],
    teachers: [
      { name: 'Teacher 1', employeeNumber: 'T001' },
      { name: 'Teacher 2', employeeNumber: 'T002' },
      { name: 'Teacher 3', employeeNumber: 'T003' },
      { name: 'Teacher 4', employeeNumber: 'T004' },
      { name: 'Teacher 5', employeeNumber: 'T005' }
    ],
    assignments: [
      { subjectIndex: 0, teacherIndex: 0 },
      { subjectIndex: 1, teacherIndex: 1 },
      { subjectIndex: 2, teacherIndex: 0 },
      { subjectIndex: 3, teacherIndex: 2 },
      { subjectIndex: 4, teacherIndex: 3 },
      { subjectIndex: 5, teacherIndex: 2 },
      { subjectIndex: 6, teacherIndex: 4 },
      { subjectIndex: 7, teacherIndex: 4 },
      { subjectIndex: 8, teacherIndex: 3 },
      { subjectIndex: 9, teacherIndex: 4 }
    ]
  }
]

// ============================================================================
// Main Test Function
// ============================================================================

async function main() {
  console.log('🧪 Starting Mock Data Generation Tests...\n')

  try {
    // Run tests for each scenario
    for (let i = 0; i < MOCK_SCENARIOS.length; i++) {
      const scenario = MOCK_SCENARIOS[i]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📊 Scenario ${i + 1}/${MOCK_SCENARIOS.length}: ${scenario.name}`)
      console.log('='.repeat(60))

      await testScenario(scenario)

      if (i < MOCK_SCENARIOS.length - 1) {
        console.log('\n⏳ Waiting 1 second before next scenario...')
        await sleep(1000)
      }
    }

    console.log('\n✅ All mock data tests completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================================================
// Test Scenario
// ============================================================================

async function testScenario(scenario) {
  console.log('\n📊 Scenario Details:')
  console.log(`   - Subjects: ${scenario.subjects.length}`)
  console.log(`   - Teachers: ${scenario.teachers.length}`)
  console.log(`   - Assignments: ${scenario.assignments.length}`)

  // Calculate total periods
  const totalPeriods = scenario.subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0)
  console.log(`   - Total Periods Required: ${totalPeriods}`)
  console.log(`   - Available Slots: 40 (5 days × 8 periods)`)

  if (totalPeriods > 40) {
    console.log(`   ⚠️  WARNING: Overloaded (${totalPeriods - 40} periods over capacity)`)
  }

  // Import generator
  const { generateTimetable } = require('./src/lib/timetable-generator')

  // Prepare mock data
  const mockCurriculumSubjects = scenario.subjects.map((subject, index) => ({
    id: `cs-${index}`,
    subjectId: `s-${index}`,
    subject: {
      id: `s-${index}`,
      name: subject.name,
      code: subject.code
    },
    periodsPerWeek: subject.periodsPerWeek,
    isCore: subject.isHeavy
  }))

  const mockStaffSubjects = scenario.assignments.map((assignment, index) => {
    const subject = scenario.subjects[assignment.subjectIndex]
    const teacher = scenario.teachers[assignment.teacherIndex]

    return {
      id: `ss-${index}`,
      subjectId: `s-${assignment.subjectIndex}`,
      staffId: `t-${assignment.teacherIndex}`,
      staff: {
        id: `t-${assignment.teacherIndex}`,
        firstName: teacher.name.split(' ')[0],
        lastName: teacher.name.split(' ')[1] || '',
        employeeNumber: teacher.employeeNumber
      },
      subject: {
        id: `s-${assignment.subjectIndex}`,
        name: subject.name,
        code: subject.code
      }
    }
  })

  const config = {
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

  // Run generation
  console.log('\n⚡ Generating timetable...')
  const startTime = Date.now()

  try {
    const result = await generateTimetable(
      mockCurriculumSubjects,
      mockStaffSubjects,
      [],
      config
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
      console.log(`   - Fill Rate: ${Math.round((result.stats.filledSlots / result.stats.totalSlots) * 100)}%`)
      console.log(`   - Teacher Gaps: ${result.stats.teacherGaps}`)
      console.log(`   - Heavy Afternoon: ${result.stats.heavyAfternoon}`)
    }

    // Analyze subject coverage
    console.log('\n📚 Subject Coverage:')
    const subjectCounts = new Map()
    for (const entry of result.entries) {
      const subject = mockCurriculumSubjects.find(cs => cs.id === entry.curriculumSubjectId)
      if (subject) {
        subjectCounts.set(subject.subject.name, (subjectCounts.get(subject.subject.name) || 0) + 1)
      }
    }

    for (const subject of scenario.subjects) {
      const assigned = subjectCounts.get(subject.name) || 0
      const required = subject.periodsPerWeek
      const coverage = Math.round((assigned / required) * 100)

      const status = assigned === required ? '✅' : assigned > 0 ? '⚠️' : '❌'
      console.log(`   ${status} ${subject.name}: ${assigned}/${required} (${coverage}%)`)
    }

    // Analyze teacher workload
    console.log('\n👥 Teacher Workload:')
    const teacherCounts = new Map()
    for (const entry of result.entries) {
      const assignment = mockStaffSubjects.find(ss => ss.id === entry.staffSubjectId)
      if (assignment) {
        const teacherName = `${assignment.staff.firstName} ${assignment.staff.lastName}`
        teacherCounts.set(teacherName, (teacherCounts.get(teacherName) || 0) + 1)
      }
    }

    for (const teacher of scenario.teachers) {
      const periods = teacherCounts.get(teacher.name) || 0
      const status = periods > 30 ? '⚠️' : periods > 0 ? '✅' : '❌'
      console.log(`   ${status} ${teacher.name}: ${periods} periods/week`)
    }

    // Display conflicts
    if (result.conflicts.length > 0) {
      console.log('\n⚠️  Conflicts:')
      for (const conflict of result.conflicts.slice(0, 5)) {
        console.log(`   - ${conflict}`)
      }
      if (result.conflicts.length > 5) {
        console.log(`   ... and ${result.conflicts.length - 5} more`)
      }
    }

    // Display suggestions
    if (result.suggestions.length > 0) {
      console.log('\n💡 Suggestions:')
      for (const suggestion of result.suggestions.slice(0, 5)) {
        console.log(`   - ${suggestion}`)
      }
      if (result.suggestions.length > 5) {
        console.log(`   ... and ${result.suggestions.length - 5} more`)
      }
    }

    // Quality assessment
    console.log('\n🎯 Quality Assessment:')
    if (result.score >= 80) {
      console.log('   🎉 Excellent! Timetable meets high quality standards.')
    } else if (result.score >= 60) {
      console.log('   👍 Good! Timetable is acceptable with minor improvements needed.')
    } else if (result.score >= 40) {
      console.log('   ⚠️  Fair. Timetable needs significant improvements.')
    } else {
      console.log('   ❌ Poor. Timetable requires major restructuring.')
    }

    if (result.conflicts.length === 0) {
      console.log('   ✅ No conflicts detected - ready for use!')
    } else {
      console.log(`   ⚠️  ${result.conflicts.length} conflict(s) need resolution before use.`)
    }

    return result

  } catch (error) {
    console.error('❌ Generation failed:', error.message)
    console.error(error.stack)
    throw error
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
