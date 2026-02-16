/**
 * Check School Model Connections
 * 
 * Analyzes which models are connected to School and which are not
 */

const fs = require('fs')

function analyzeSchemaConnections() {
  console.log('🔍 Analyzing Prisma Schema for School Connections...\n')

  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf-8')
  
  // Extract all model definitions
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g
  const models = []
  let match

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1]
    const modelBody = match[2]
    
    // Check if model has schoolId field
    const hasSchoolId = /schoolId\s+String/.test(modelBody)
    
    // Check if model has school relation
    const hasSchoolRelation = /school\s+School\s+@relation/.test(modelBody)
    
    // Check if it's a relation through another model
    const hasIndirectSchool = /\w+\s+\w+\s+@relation.*schoolId/.test(modelBody)
    
    models.push({
      name: modelName,
      hasSchoolId,
      hasSchoolRelation,
      hasIndirectSchool,
    })
  }

  // Categorize models
  const directlyConnected = models.filter(m => m.hasSchoolId && m.hasSchoolRelation)
  const hasSchoolIdOnly = models.filter(m => m.hasSchoolId && !m.hasSchoolRelation)
  const notConnected = models.filter(m => !m.hasSchoolId && !m.hasSchoolRelation)
  
  // Models that SHOULD be connected but aren't
  const shouldBeConnected = notConnected.filter(m => {
    // Exclude system-wide models
    const systemModels = [
      'School', // The school itself
      'User', // Users can be super admin (no school)
      'RolePermission', // System-wide permissions
      'SystemLock', // System-wide locks
      'PasswordReset', // Temporary tokens
      'AuthAuditLog', // System-wide auth logs
    ]
    return !systemModels.includes(m.name)
  })

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ MODELS PROPERLY CONNECTED TO SCHOOL')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Total: ${directlyConnected.length} models\n`)
  
  directlyConnected.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name}`)
  })

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('⚠️ MODELS WITH schoolId BUT NO RELATION')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Total: ${hasSchoolIdOnly.length} models\n`)
  
  if (hasSchoolIdOnly.length === 0) {
    console.log('✅ None - All models with schoolId have proper relations!')
  } else {
    hasSchoolIdOnly.forEach((m, i) => {
      console.log(`${i + 1}. ${m.name} ⚠️ Missing: school School @relation(...)`)
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('❌ MODELS NOT CONNECTED TO SCHOOL')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Total: ${notConnected.length} models\n`)
  
  // Separate system models from data models
  const systemModels = ['School', 'User', 'RolePermission', 'SystemLock', 'PasswordReset', 'AuthAuditLog']
  const systemNotConnected = notConnected.filter(m => systemModels.includes(m.name))
  const dataNotConnected = notConnected.filter(m => !systemModels.includes(m.name))

  console.log('🔧 System Models (OK to not have schoolId):')
  systemNotConnected.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name} ✅`)
  })

  console.log('\n⚠️ Data Models (SHOULD have schoolId):')
  if (dataNotConnected.length === 0) {
    console.log('  ✅ None - All data models are connected!')
  } else {
    dataNotConnected.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} ❌ MISSING schoolId!`)
    })
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('📊 SUMMARY')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Total Models:              ${models.length}`)
  console.log(`✅ Connected to School:    ${directlyConnected.length}`)
  console.log(`⚠️ Has schoolId only:      ${hasSchoolIdOnly.length}`)
  console.log(`❌ Not connected:          ${notConnected.length}`)
  console.log(`   - System models (OK):   ${systemNotConnected.length}`)
  console.log(`   - Data models (BAD):    ${dataNotConnected.length}`)

  if (dataNotConnected.length > 0) {
    console.log('\n⚠️ WARNING: Some data models are not connected to School!')
    console.log('This can cause data leakage between schools (multi-tenancy issue)')
  } else if (hasSchoolIdOnly.length > 0) {
    console.log('\n⚠️ WARNING: Some models have schoolId but no relation!')
    console.log('Add: school School @relation(fields: [schoolId], references: [id])')
  } else {
    console.log('\n✅ EXCELLENT: All data models are properly connected to School!')
    console.log('Your multi-tenancy setup is correct!')
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('🔍 DETAILED ANALYSIS')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Check specific important models
  const importantModels = [
    'Student', 'Staff', 'Teacher', 'Guardian',
    'Class', 'Subject', 'Term', 'AcademicYear',
    'Exam', 'Mark', 'Result', 'Attendance',
    'Payment', 'Invoice', 'Receipt', 'FeeStructure',
    'Message', 'Announcement', 'CAEntry', 'ExamEntry',
    'GradingSystem', 'DoSTimetable', 'Competency',
  ]

  console.log('Critical Models Connection Status:\n')
  importantModels.forEach(modelName => {
    const model = models.find(m => m.name === modelName)
    if (!model) {
      console.log(`❓ ${modelName} - NOT FOUND IN SCHEMA`)
    } else if (model.hasSchoolId && model.hasSchoolRelation) {
      console.log(`✅ ${modelName} - Properly connected`)
    } else if (model.hasSchoolId && !model.hasSchoolRelation) {
      console.log(`⚠️ ${modelName} - Has schoolId but missing relation`)
    } else {
      console.log(`❌ ${modelName} - NOT CONNECTED TO SCHOOL!`)
    }
  })

  console.log('\n✅ Analysis Complete!\n')

  return {
    total: models.length,
    connected: directlyConnected.length,
    hasSchoolIdOnly: hasSchoolIdOnly.length,
    notConnected: notConnected.length,
    dataModelsNotConnected: dataNotConnected.length,
    issues: dataNotConnected.length > 0 || hasSchoolIdOnly.length > 0,
  }
}

// Run analysis
try {
  const result = analyzeSchemaConnections()
  
  if (result.issues) {
    console.log('⚠️ ISSUES FOUND - Review the models above')
    process.exit(1)
  } else {
    console.log('✅ NO ISSUES - Schema is properly connected!')
    process.exit(0)
  }
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
