/**
 * Populate schoolId for Phase 2 Models - Using Raw MongoDB
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function populatePhase2Raw() {
  console.log('🔄 Populating schoolId for Phase 2 Models (Raw MongoDB)...\n')

  try {
    const school = await prisma.school.findFirst()
    
    if (!school) {
      console.log('❌ No school found!')
      return
    }

    const schoolId = school.id
    console.log(`School: ${school.name} (${school.code})`)
    console.log(`ID: ${schoolId}\n`)

    console.log('Updating records using raw MongoDB...\n')

    // Relation Models (8)
    const classSubjectResult = await prisma.classSubject.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ ClassSubject: ${classSubjectResult.count} records updated`)

    const staffSubjectResult = await prisma.staffSubject.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ StaffSubject: ${staffSubjectResult.count} records updated`)

    const staffClassResult = await prisma.staffClass.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ StaffClass: ${staffClassResult.count} records updated`)

    const studentGuardianResult = await prisma.studentGuardian.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ StudentGuardian: ${studentGuardianResult.count} records updated`)

    const gradeRangeResult = await prisma.gradeRange.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ GradeRange: ${gradeRangeResult.count} records updated`)

    const feeItemResult = await prisma.feeItem.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ FeeItem: ${feeItemResult.count} records updated`)

    const invoiceItemResult = await prisma.invoiceItem.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ InvoiceItem: ${invoiceItemResult.count} records updated`)

    const paymentAllocationResult = await prisma.paymentAllocation.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ PaymentAllocation: ${paymentAllocationResult.count} records updated`)

    // Guardian Models (3)
    const guardianDocumentResult = await prisma.guardianDocument.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ GuardianDocument: ${guardianDocumentResult.count} records updated`)

    const guardianPortalAccessResult = await prisma.guardianPortalAccess.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ GuardianPortalAccess: ${guardianPortalAccessResult.count} records updated`)

    const guardianAuditLogResult = await prisma.guardianAuditLog.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ GuardianAuditLog: ${guardianAuditLogResult.count} records updated`)

    // Staff Models (3)
    const staffResponsibilityResult = await prisma.staffResponsibility.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ StaffResponsibility: ${staffResponsibilityResult.count} records updated`)

    const staffHistoryEntryResult = await prisma.staffHistoryEntry.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ StaffHistoryEntry: ${staffHistoryEntryResult.count} records updated`)

    const staffDocumentResult = await prisma.staffDocument.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ StaffDocument: ${staffDocumentResult.count} records updated`)

    // Assessment Models (6)
    const teacherAlertResult = await prisma.teacherAlert.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TeacherAlert: ${teacherAlertResult.count} records updated`)

    const learningEvidenceResult = await prisma.learningEvidence.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ LearningEvidence: ${learningEvidenceResult.count} records updated`)

    const teacherAssessmentResult = await prisma.teacherAssessment.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TeacherAssessment: ${teacherAssessmentResult.count} records updated`)

    const teacherAssessmentResultResult = await prisma.teacherAssessmentResult.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TeacherAssessmentResult: ${teacherAssessmentResultResult.count} records updated`)

    const assessmentPlanResult = await prisma.assessmentPlan.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ AssessmentPlan: ${assessmentPlanResult.count} records updated`)

    const continuousAssessmentResult = await prisma.continuousAssessment.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ ContinuousAssessment: ${continuousAssessmentResult.count} records updated`)

    const total = classSubjectResult.count + staffSubjectResult.count + staffClassResult.count +
                  studentGuardianResult.count + gradeRangeResult.count + feeItemResult.count +
                  invoiceItemResult.count + paymentAllocationResult.count +
                  guardianDocumentResult.count + guardianPortalAccessResult.count + guardianAuditLogResult.count +
                  staffResponsibilityResult.count + staffHistoryEntryResult.count + staffDocumentResult.count +
                  teacherAlertResult.count + learningEvidenceResult.count + teacherAssessmentResult.count +
                  teacherAssessmentResultResult.count + assessmentPlanResult.count + continuousAssessmentResult.count

    console.log(`\n🎉 Total: ${total} records updated with schoolId\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

populatePhase2Raw()
