/**
 * Populate schoolId for Phase 3 Models - Using Raw MongoDB
 * 
 * Phase 3 Models (25 models):
 * - Communication: SecureLink, LoginAttempt, ShortUrlClick, BulkMessageItem, DirectMessage, AutomationExecution, AnnouncementDelivery
 * - Timetable: TimetableSlot, TimetableConflict
 * - Teacher: TeacherDocument, TeacherHistoryEntry, TeacherExaminationRoleAssignment
 * - Assignment: AssignmentSubmission
 * - DoS: DoSAssessmentPlan, DoSContinuousAssessment, DoSExam, DoSExamResult, DoSFinalScore, DoSTimetableEntry, DosApproval
 * - Assessment: CAResult
 * - Competency: CompetencyProgress, CompetencyMapping, CompetencyAuditTrail
 * - PDF: PDFAccess
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function populatePhase3Raw() {
  console.log('🔄 Populating schoolId for Phase 3 Models (Raw MongoDB)...\n')

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

    // Communication Models (7)
    const secureLinkResult = await prisma.secureLink.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ SecureLink: ${secureLinkResult.count} records updated`)

    const loginAttemptResult = await prisma.loginAttempt.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ LoginAttempt: ${loginAttemptResult.count} records updated`)

    const shortUrlClickResult = await prisma.shortUrlClick.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ ShortUrlClick: ${shortUrlClickResult.count} records updated`)

    const bulkMessageItemResult = await prisma.bulkMessageItem.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ BulkMessageItem: ${bulkMessageItemResult.count} records updated`)

    const directMessageResult = await prisma.directMessage.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DirectMessage: ${directMessageResult.count} records updated`)

    const automationExecutionResult = await prisma.automationExecution.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ AutomationExecution: ${automationExecutionResult.count} records updated`)

    const announcementDeliveryResult = await prisma.announcementDelivery.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ AnnouncementDelivery: ${announcementDeliveryResult.count} records updated`)

    // Timetable Models (2)
    const timetableSlotResult = await prisma.timetableSlot.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TimetableSlot: ${timetableSlotResult.count} records updated`)

    const timetableConflictResult = await prisma.timetableConflict.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TimetableConflict: ${timetableConflictResult.count} records updated`)

    // Teacher Models (3)
    const teacherDocumentResult = await prisma.teacherDocument.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TeacherDocument: ${teacherDocumentResult.count} records updated`)

    const teacherHistoryEntryResult = await prisma.teacherHistoryEntry.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TeacherHistoryEntry: ${teacherHistoryEntryResult.count} records updated`)

    const teacherExaminationRoleAssignmentResult = await prisma.teacherExaminationRoleAssignment.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ TeacherExaminationRoleAssignment: ${teacherExaminationRoleAssignmentResult.count} records updated`)

    // Assignment Models (1)
    const assignmentSubmissionResult = await prisma.assignmentSubmission.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ AssignmentSubmission: ${assignmentSubmissionResult.count} records updated`)

    // DoS Models (6)
    const doSAssessmentPlanResult = await prisma.doSAssessmentPlan.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DoSAssessmentPlan: ${doSAssessmentPlanResult.count} records updated`)

    const doSContinuousAssessmentResult = await prisma.doSContinuousAssessment.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DoSContinuousAssessment: ${doSContinuousAssessmentResult.count} records updated`)

    const doSExamResult = await prisma.doSExam.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DoSExam: ${doSExamResult.count} records updated`)

    const doSExamResultResult = await prisma.doSExamResult.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DoSExamResult: ${doSExamResultResult.count} records updated`)

    const doSFinalScoreResult = await prisma.doSFinalScore.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DoSFinalScore: ${doSFinalScoreResult.count} records updated`)

    const doSTimetableEntryResult = await prisma.doSTimetableEntry.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DoSTimetableEntry: ${doSTimetableEntryResult.count} records updated`)

    const dosApprovalResult = await prisma.dosApproval.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ DosApproval: ${dosApprovalResult.count} records updated`)

    // Assessment Models (1)
    const caResultResult = await prisma.cAResult.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ CAResult: ${caResultResult.count} records updated`)

    // Competency Models (3)
    const competencyProgressResult = await prisma.competencyProgress.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ CompetencyProgress: ${competencyProgressResult.count} records updated`)

    const competencyMappingResult = await prisma.competencyMapping.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ CompetencyMapping: ${competencyMappingResult.count} records updated`)

    const competencyAuditTrailResult = await prisma.competencyAuditTrail.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ CompetencyAuditTrail: ${competencyAuditTrailResult.count} records updated`)

    // PDF Models (1)
    const pdfAccessResult = await prisma.pDFAccess.updateMany({
      where: {},
      data: { schoolId },
    })
    console.log(`✅ PDFAccess: ${pdfAccessResult.count} records updated`)

    const total = secureLinkResult.count + loginAttemptResult.count + shortUrlClickResult.count +
                  bulkMessageItemResult.count + directMessageResult.count + automationExecutionResult.count +
                  announcementDeliveryResult.count + timetableSlotResult.count + timetableConflictResult.count +
                  teacherDocumentResult.count + teacherHistoryEntryResult.count + teacherExaminationRoleAssignmentResult.count +
                  assignmentSubmissionResult.count + doSAssessmentPlanResult.count + doSContinuousAssessmentResult.count +
                  doSExamResult.count + doSExamResultResult.count + doSFinalScoreResult.count +
                  doSTimetableEntryResult.count + dosApprovalResult.count + caResultResult.count +
                  competencyProgressResult.count + competencyMappingResult.count + competencyAuditTrailResult.count +
                  pdfAccessResult.count

    console.log(`\n🎉 Total: ${total} records updated with schoolId\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

populatePhase3Raw()
