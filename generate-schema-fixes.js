/**
 * Generate Schema Fixes
 * 
 * Analyzes the schema and generates the exact fixes needed
 * Creates a patch file that can be reviewed before applying
 */

const fs = require('fs')

function generateSchemaFixes() {
  console.log('🔧 Generating Schema Fixes...\n')

  const schemaPath = 'prisma/schema.prisma'
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')

  // Models that need schoolId added
  const modelsNeedingSchoolId = [
    // Critical models
    'Guardian', 'Term', 'Stream', 'Mark', 'Result', 'Attendance',
    'CAEntry', 'ExamEntry', 'DisciplineCase', 'StudentDocument',
    
    // Relation models
    'ClassSubject', 'StaffSubject', 'StaffClass', 'StudentGuardian',
    'GradeRange', 'FeeItem', 'InvoiceItem', 'PaymentAllocation',
    
    // Assessment models
    'TeacherAlert', 'LearningEvidence', 'TeacherAssessment',
    'TeacherAssessmentResult', 'DoSAssessmentPlan', 'DoSContinuousAssessment',
    'DoSExam', 'DoSExamResult', 'DoSFinalScore', 'DoSTimetableEntry',
    'AssessmentPlan', 'ContinuousAssessment', 'CAResult',
    
    // Staff models
    'StaffResponsibility', 'StaffHistoryEntry', 'StaffDocument',
    
    // Guardian models
    'GuardianDocument', 'GuardianPortalAccess', 'GuardianAuditLog',
    
    // Finance models
    'StudentDiscount', 'StudentPenalty', 'StudentMilestoneStatus',
    
    // Timetable models
    'TimetableEntry', 'TimetableSlot', 'TimetableConflict',
    
    // Teacher models
    'TeacherDocument', 'TeacherHistoryEntry', 'TeacherExaminationRoleAssignment',
    
    // DoS models
    'DosApproval',
    
    // Competency models
    'CompetencyProgress', 'CompetencyMapping', 'CompetencyAuditTrail',
    
    // Communication models
    'SecureLink', 'DirectMessage',
    
    // Other models
    'TimetableApproval', 'AnnouncementDelivery',
  ]

  // Models that have schoolId but need relation
  const modelsNeedingRelation = [
    'User', 'SystemLock', 'PasswordReset', 'StaffTask',
    'PublishedReportCard', 'FeeStructure', 'DiscountRule', 'PenaltyRule',
    'Invoice', 'Payment', 'Receipt', 'FinanceAuditLog',
    'FinanceNotificationLog', 'FinanceSettings', 'AuthAuditLog',
    'OTPVerification', 'TeacherSmsPermissionCode', 'TeacherDraft',
    'TeacherPerformanceMetric', 'ReportCardTemplate', 'NewCurriculumReportCard',
    'DoSReportCard', 'DoSPromotionDecision', 'DoSAuditLog',
  ]

  console.log('═══════════════════════════════════════════════════════════')
  console.log('📋 MODELS TO FIX')
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log(`Models needing schoolId:     ${modelsNeedingSchoolId.length}`)
  console.log(`Models needing relation:     ${modelsNeedingRelation.length}`)
  console.log(`Total fixes needed:          ${modelsNeedingSchoolId.length + modelsNeedingRelation.length}\n`)

  // Generate fixes
  let fixes = []

  fixes.push('# Prisma Schema Fixes - Add schoolId and Relations\n')
  fixes.push('# Generated: ' + new Date().toISOString() + '\n')
  fixes.push('# Total fixes: ' + (modelsNeedingSchoolId.length + modelsNeedingRelation.length) + '\n\n')

  fixes.push('## CRITICAL: This is a REFERENCE file, not executable code!\n')
  fixes.push('## You need to manually apply these changes to prisma/schema.prisma\n\n')

  fixes.push('═══════════════════════════════════════════════════════════\n')
  fixes.push('PART 1: Add schoolId field + relation (${modelsNeedingSchoolId.length} models)\n')
  fixes.push('═══════════════════════════════════════════════════════════\n\n')

  modelsNeedingSchoolId.forEach((modelName, i) => {
    fixes.push(`${i + 1}. ${modelName}\n`)
    fixes.push(`   Add after the id field:\n`)
    fixes.push(`   schoolId  String  @db.ObjectId\n`)
    fixes.push(`   \n`)
    fixes.push(`   Add in relations section:\n`)
    fixes.push(`   school    School  @relation(fields: [schoolId], references: [id], onDelete: Cascade)\n`)
    fixes.push(`   \n`)
    fixes.push(`   Add in indexes section:\n`)
    fixes.push(`   @@index([schoolId])\n`)
    fixes.push(`\n`)
  })

  fixes.push('\n═══════════════════════════════════════════════════════════\n')
  fixes.push(`PART 2: Add relation only (${modelsNeedingRelation.length} models)\n`)
  fixes.push('═══════════════════════════════════════════════════════════\n\n')

  modelsNeedingRelation.forEach((modelName, i) => {
    fixes.push(`${i + 1}. ${modelName}\n`)
    fixes.push(`   Add in relations section:\n`)
    fixes.push(`   school    School  @relation(fields: [schoolId], references: [id], onDelete: Cascade)\n`)
    fixes.push(`   \n`)
    fixes.push(`   Verify index exists:\n`)
    fixes.push(`   @@index([schoolId])\n`)
    fixes.push(`\n`)
  })

  fixes.push('\n═══════════════════════════════════════════════════════════\n')
  fixes.push('PART 3: Update School model\n')
  fixes.push('═══════════════════════════════════════════════════════════\n\n')
  fixes.push('Add these relations to the School model:\n\n')

  const allModels = [...modelsNeedingSchoolId, ...modelsNeedingRelation]
  allModels.forEach((modelName) => {
    const relationName = modelName.charAt(0).toLowerCase() + modelName.slice(1) + 's'
    fixes.push(`  ${relationName.padEnd(30)} ${modelName}[]\n`)
  })

  // Write to file
  const outputPath = 'SCHEMA-FIXES-REFERENCE.txt'
  fs.writeFileSync(outputPath, fixes.join(''))

  console.log(`✅ Generated fixes reference file: ${outputPath}\n`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log('⚠️ IMPORTANT: MANUAL STEPS REQUIRED')
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log('This is TOO LARGE to automate safely. You need to:')
  console.log('')
  console.log('1. 📖 Review SCHEMA-FIXES-REFERENCE.txt')
  console.log('2. ✏️ Manually edit prisma/schema.prisma')
  console.log('3. 🔧 Add schoolId fields to models in Part 1')
  console.log('4. 🔗 Add School relations to all models')
  console.log('5. 📊 Update School model with new relations')
  console.log('6. ✅ Run: npx prisma format (to check syntax)')
  console.log('7. ✅ Run: npx prisma validate')
  console.log('8. ✅ Run: npx prisma db push')
  console.log('9. ✅ Run: node migrate-add-schoolid.js')
  console.log('')
  console.log('💡 TIP: Do this in small batches (10-20 models at a time)')
  console.log('        Test after each batch to catch errors early')
  console.log('')
  console.log('═══════════════════════════════════════════════════════════\n')

  return {
    modelsNeedingSchoolId: modelsNeedingSchoolId.length,
    modelsNeedingRelation: modelsNeedingRelation.length,
    total: modelsNeedingSchoolId.length + modelsNeedingRelation.length,
    outputFile: outputPath,
  }
}

// Run
try {
  const result = generateSchemaFixes()
  console.log(`✅ Generated reference for ${result.total} model fixes`)
  console.log(`📄 File: ${result.outputFile}\n`)
  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
