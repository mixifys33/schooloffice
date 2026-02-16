/**
 * Data Integrity Check - CRITICAL
 * 
 * Checks for cross-school data contamination before migration
 * Run this BEFORE adding schoolId fields to verify data integrity
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDataIntegrity() {
  console.log('🔍 CRITICAL: Checking Data Integrity Before Migration...\n')
  console.log('This will identify any cross-school data contamination\n')

  const issues = []
  let totalChecks = 0

  try {
    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, code: true },
    })

    console.log(`Found ${schools.length} school(s) in database\n`)

    if (schools.length === 0) {
      console.log('⚠️ No schools found - cannot perform integrity check')
      return
    }

    if (schools.length === 1) {
      console.log('✅ Single school detected - data integrity is guaranteed')
      console.log(`   School: ${schools[0].name} (${schools[0].code})`)
      console.log('\n💡 Migration is SAFE to proceed\n')
      return { totalChecks: 0, issues: [], critical: 0, warnings: 0, canProceed: true }
    }

    console.log('⚠️ Multiple schools detected - checking for data contamination...\n')
    schools.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.code}) - ID: ${s.id}`)
    })
    console.log('')

    // Check models that should have schoolId but don't
    const checksToRun = [
      {
        name: 'Guardian',
        check: async () => {
          const count = await prisma.guardian.count()
          return { count, canDetermine: false, message: 'Cannot determine school ownership - needs manual review' }
        },
      },
      {
        name: 'Term',
        check: async () => {
          const terms = await prisma.term.findMany({
            include: { academicYear: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(terms.map(t => t.academicYear.schoolId))
          return {
            count: terms.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'Stream',
        check: async () => {
          const streams = await prisma.stream.findMany({
            include: { class: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(streams.map(s => s.class.schoolId))
          return {
            count: streams.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'Mark',
        check: async () => {
          const marks = await prisma.mark.findMany({
            include: { exam: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(marks.map(m => m.exam.schoolId))
          return {
            count: marks.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'Result',
        check: async () => {
          const results = await prisma.result.findMany({
            include: { student: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(results.map(r => r.student.schoolId))
          return {
            count: results.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'Attendance',
        check: async () => {
          const attendance = await prisma.attendance.findMany({
            include: { student: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(attendance.map(a => a.student.schoolId))
          return {
            count: attendance.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'CAEntry',
        check: async () => {
          const entries = await prisma.cAEntry.findMany({
            include: { student: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(entries.map(e => e.student.schoolId))
          return {
            count: entries.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'ExamEntry',
        check: async () => {
          const entries = await prisma.examEntry.findMany({
            include: { student: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(entries.map(e => e.student.schoolId))
          return {
            count: entries.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
      {
        name: 'DisciplineCase',
        check: async () => {
          const cases = await prisma.disciplineCase.findMany({
            include: { student: { select: { schoolId: true } } },
          })
          const schoolIds = new Set(cases.map(c => c.student.schoolId))
          return {
            count: cases.length,
            canDetermine: true,
            schoolCount: schoolIds.size,
            isClean: schoolIds.size <= 1,
          }
        },
      },
    ]

    console.log('═══════════════════════════════════════════════════════════')
    console.log('🔍 CHECKING CRITICAL MODELS')
    console.log('═══════════════════════════════════════════════════════════\n')

    for (const { name, check } of checksToRun) {
      totalChecks++
      try {
        const result = await check()
        
        if (result.count === 0) {
          console.log(`✅ ${name}: No records (safe)`)
        } else if (!result.canDetermine) {
          console.log(`⚠️ ${name}: ${result.count} records - ${result.message}`)
          issues.push({ model: name, severity: 'warning', message: result.message })
        } else if (result.isClean) {
          console.log(`✅ ${name}: ${result.count} records - All belong to 1 school`)
        } else {
          console.log(`❌ ${name}: ${result.count} records - CONTAMINATED (${result.schoolCount} schools)`)
          issues.push({
            model: name,
            severity: 'critical',
            message: `Data from ${result.schoolCount} different schools mixed together`,
          })
        }
      } catch (error) {
        console.log(`❌ ${name}: Error checking - ${error.message}`)
        issues.push({ model: name, severity: 'error', message: error.message })
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('📊 INTEGRITY CHECK SUMMARY')
    console.log('═══════════════════════════════════════════════════════════\n')

    const critical = issues.filter(i => i.severity === 'critical')
    const warnings = issues.filter(i => i.severity === 'warning')
    const errors = issues.filter(i => i.severity === 'error')

    console.log(`Total Checks:      ${totalChecks}`)
    console.log(`✅ Clean:          ${totalChecks - issues.length}`)
    console.log(`❌ Critical:       ${critical.length}`)
    console.log(`⚠️ Warnings:       ${warnings.length}`)
    console.log(`🔥 Errors:         ${errors.length}`)

    if (critical.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:\n')
      critical.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.model}: ${issue.message}`)
      })
      console.log('\n⛔ MIGRATION BLOCKED - Fix data contamination first!')
      console.log('   You need to manually clean up cross-school data before migration')
    } else if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:\n')
      warnings.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.model}: ${issue.message}`)
      })
      console.log('\n⚠️ PROCEED WITH CAUTION - Manual review recommended')
    } else {
      console.log('\n✅ ALL CHECKS PASSED!')
      console.log('   Data integrity is good - safe to proceed with migration')
    }

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('💡 NEXT STEPS')
    console.log('═══════════════════════════════════════════════════════════\n')

    if (critical.length > 0) {
      console.log('1. ⛔ DO NOT RUN MIGRATION YET')
      console.log('2. 🔧 Clean up cross-school data manually')
      console.log('3. 🔄 Re-run this integrity check')
      console.log('4. ✅ Once clean, proceed with migration')
    } else {
      console.log('1. ✅ Run: node update-prisma-schema.js')
      console.log('2. ✅ Run: npx prisma db push')
      console.log('3. ✅ Run: node migrate-add-schoolid.js')
      console.log('4. ✅ Test your application')
    }

    console.log('\n✅ Integrity Check Complete!\n')

    return {
      totalChecks,
      issues,
      critical: critical.length,
      warnings: warnings.length,
      canProceed: critical.length === 0,
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkDataIntegrity()
  .then((result) => {
    if (result && result.canProceed) {
      console.log('✅ Safe to proceed with migration')
      process.exit(0)
    } else {
      console.log('⛔ Migration blocked - fix issues first')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
