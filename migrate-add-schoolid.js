/**
 * Migrate - Add schoolId to Existing Records
 * 
 * Populates schoolId for all existing records after schema update
 * Run this AFTER updating schema and running `npx prisma db push`
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateAddSchoolId() {
  console.log('🔄 Migrating Data - Adding schoolId to Existing Records...\n')

  try {
    // Get the school (should be only one)
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, code: true },
    })

    if (schools.length === 0) {
      console.log('❌ No schools found in database!')
      return
    }

    if (schools.length > 1) {
      console.log('⚠️ Multiple schools found - this script only works for single school!')
      console.log('   You need to manually assign schoolId for each record')
      return
    }

    const school = schools[0]
    const schoolId = school.id

    console.log(`✅ Found school: ${school.name} (${school.code})`)
    console.log(`   School ID: ${schoolId}\n`)

    console.log('═══════════════════════════════════════════════════════════')
    console.log('🔄 UPDATING RECORDS')
    console.log('═══════════════════════════════════════════════════════════\n')

    const updates = []

    // Helper function to update a model
    async function updateModel(modelName, prismaModel) {
      try {
        const count = await prismaModel.count({ where: { schoolId: null } })
        
        if (count === 0) {
          console.log(`✅ ${modelName}: Already migrated (0 records need update)`)
          return { model: modelName, count: 0, success: true }
        }

        const result = await prismaModel.updateMany({
          where: { schoolId: null },
          data: { schoolId },
        })

        console.log(`✅ ${modelName}: Updated ${result.count} records`)
        return { model: modelName, count: result.count, success: true }
      } catch (error) {
        if (error.message.includes('Unknown field')) {
          console.log(`⚠️ ${modelName}: Field not added yet (skip)`)
          return { model: modelName, count: 0, success: false, skipped: true }
        }
        console.log(`❌ ${modelName}: Error - ${error.message}`)
        return { model: modelName, count: 0, success: false, error: error.message }
      }
    }

    // Update models that need schoolId populated
    // Only include models where schoolId field was added in schema

    // Critical models
    updates.push(await updateModel('Guardian', prisma.guardian))
    updates.push(await updateModel('Term', prisma.term))
    updates.push(await updateModel('Stream', prisma.stream))
    updates.push(await updateModel('Mark', prisma.mark))
    updates.push(await updateModel('Result', prisma.result))
    updates.push(await updateModel('Attendance', prisma.attendance))
    updates.push(await updateModel('CAEntry', prisma.cAEntry))
    updates.push(await updateModel('ExamEntry', prisma.examEntry))
    updates.push(await updateModel('DisciplineCase', prisma.disciplineCase))
    updates.push(await updateModel('StudentDocument', prisma.studentDocument))

    // Relation models
    updates.push(await updateModel('ClassSubject', prisma.classSubject))
    updates.push(await updateModel('StaffSubject', prisma.staffSubject))
    updates.push(await updateModel('StaffClass', prisma.staffClass))
    updates.push(await updateModel('StudentGuardian', prisma.studentGuardian))
    updates.push(await updateModel('GradeRange', prisma.gradeRange))
    updates.push(await updateModel('FeeItem', prisma.feeItem))
    updates.push(await updateModel('InvoiceItem', prisma.invoiceItem))
    updates.push(await updateModel('PaymentAllocation', prisma.paymentAllocation))

    // Assessment models
    updates.push(await updateModel('TeacherAlert', prisma.teacherAlert))
    updates.push(await updateModel('LearningEvidence', prisma.learningEvidence))
    updates.push(await updateModel('TeacherAssessment', prisma.teacherAssessment))
    updates.push(await updateModel('TeacherAssessmentResult', prisma.teacherAssessmentResult))

    // Staff models
    updates.push(await updateModel('StaffResponsibility', prisma.staffResponsibility))
    updates.push(await updateModel('StaffHistoryEntry', prisma.staffHistoryEntry))
    updates.push(await updateModel('StaffDocument', prisma.staffDocument))

    // Guardian models
    updates.push(await updateModel('GuardianDocument', prisma.guardianDocument))
    updates.push(await updateModel('GuardianPortalAccess', prisma.guardianPortalAccess))
    updates.push(await updateModel('GuardianAuditLog', prisma.guardianAuditLog))

    // Finance models
    updates.push(await updateModel('StudentDiscount', prisma.studentDiscount))
    updates.push(await updateModel('StudentPenalty', prisma.studentPenalty))
    updates.push(await updateModel('StudentMilestoneStatus', prisma.studentMilestoneStatus))

    // Timetable models
    updates.push(await updateModel('TimetableEntry', prisma.timetableEntry))

    // Teacher models
    updates.push(await updateModel('TeacherDocument', prisma.teacherDocument))
    updates.push(await updateModel('TeacherHistoryEntry', prisma.teacherHistoryEntry))
    updates.push(await updateModel('TeacherExaminationRoleAssignment', prisma.teacherExaminationRoleAssignment))

    // Communication models
    updates.push(await updateModel('SecureLink', prisma.secureLink))

    // DoS models
    updates.push(await updateModel('DoSAssessmentPlan', prisma.doSAssessmentPlan))
    updates.push(await updateModel('DoSContinuousAssessment', prisma.doSContinuousAssessment))
    updates.push(await updateModel('DoSExam', prisma.doSExam))
    updates.push(await updateModel('DoSExamResult', prisma.doSExamResult))
    updates.push(await updateModel('DoSFinalScore', prisma.doSFinalScore))
    updates.push(await updateModel('DoSTimetableEntry', prisma.doSTimetableEntry))
    updates.push(await updateModel('DosApproval', prisma.dosApproval))

    // Competency models
    updates.push(await updateModel('CompetencyProgress', prisma.competencyProgress))
    updates.push(await updateModel('CompetencyAuditTrail', prisma.competencyAuditTrail))

    // Assessment models
    updates.push(await updateModel('AssessmentPlan', prisma.assessmentPlan))
    updates.push(await updateModel('ContinuousAssessment', prisma.continuousAssessment))
    updates.push(await updateModel('CAResult', prisma.cAResult))

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('📊 MIGRATION SUMMARY')
    console.log('═══════════════════════════════════════════════════════════\n')

    const successful = updates.filter(u => u.success && !u.skipped)
    const skipped = updates.filter(u => u.skipped)
    const failed = updates.filter(u => !u.success && !u.skipped)
    const totalRecords = successful.reduce((sum, u) => sum + u.count, 0)

    console.log(`Total Models Checked:    ${updates.length}`)
    console.log(`✅ Successfully Updated: ${successful.length}`)
    console.log(`⚠️ Skipped (no field):   ${skipped.length}`)
    console.log(`❌ Failed:               ${failed.length}`)
    console.log(`📊 Total Records:        ${totalRecords}`)

    if (failed.length > 0) {
      console.log('\n❌ Failed Models:')
      failed.forEach(u => {
        console.log(`   - ${u.model}: ${u.error}`)
      })
    }

    if (skipped.length > 0) {
      console.log('\n⚠️ Skipped Models (field not added to schema yet):')
      skipped.forEach(u => {
        console.log(`   - ${u.model}`)
      })
      console.log('\n💡 Add schoolId field to these models in schema, then re-run')
    }

    console.log('\n✅ Migration Complete!\n')

    return {
      total: updates.length,
      successful: successful.length,
      skipped: skipped.length,
      failed: failed.length,
      totalRecords,
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateAddSchoolId()
  .then((result) => {
    if (result && result.failed === 0) {
      console.log('✅ All migrations successful')
      process.exit(0)
    } else {
      console.log('⚠️ Some migrations failed - review errors above')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
