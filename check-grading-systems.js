const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkGradingSystems() {
  try {
    const schoolId = '6991bad3be51462507efc102'
    const classId = '69923166a131eaef65a8e331'
    const termId = '6991fd7510948a24a0b3111a'
    
    console.log('🔍 Checking grading systems in database...\n')
    console.log('Parameters:')
    console.log('  schoolId:', schoolId)
    console.log('  classId:', classId)
    console.log('  termId:', termId)
    console.log('\n')
    
    // Get all grading systems for this school
    const gradingSystems = await prisma.gradingSystem.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        grades: {
          orderBy: { minScore: 'desc' },
        },
      },
    })
    
    console.log(`📊 Found ${gradingSystems.length} grading system(s) for this school:\n`)
    
    gradingSystems.forEach((system, index) => {
      console.log(`${index + 1}. ${system.name}`)
      console.log(`   ID: ${system.id}`)
      console.log(`   Category: ${system.category}`)
      console.log(`   ClassId: ${system.classId || 'null (school-wide)'}`)
      console.log(`   TermId: ${system.termId || 'null (all terms)'}`)
      console.log(`   IsDefault: ${system.isDefault}`)
      console.log(`   Grades: ${system.grades.length}`)
      if (system.grades.length > 0) {
        console.log('   Grade breakdown:')
        system.grades.forEach(grade => {
          console.log(`     - ${grade.grade}: ${grade.minScore}-${grade.maxScore}`)
        })
      }
      console.log('')
    })
    
    // Check if any match our criteria
    console.log('\n🔍 Checking which systems match our criteria:\n')
    
    const exactMatch = gradingSystems.find(s => 
      s.classId === classId && s.termId === termId
    )
    if (exactMatch) {
      console.log('✅ Exact match (classId + termId):', exactMatch.name)
    } else {
      console.log('❌ No exact match (classId + termId)')
    }
    
    const classMatch = gradingSystems.find(s => 
      s.classId === classId && !s.termId
    )
    if (classMatch) {
      console.log('✅ Class match (classId, no termId):', classMatch.name)
    } else {
      console.log('❌ No class match (classId, no termId)')
    }
    
    const termMatch = gradingSystems.find(s => 
      !s.classId && s.termId === termId
    )
    if (termMatch) {
      console.log('✅ Term match (termId, no classId):', termMatch.name)
    } else {
      console.log('❌ No term match (termId, no classId)')
    }
    
    const schoolWide = gradingSystems.find(s => 
      !s.classId && !s.termId
    )
    if (schoolWide) {
      console.log('✅ School-wide match (no classId, no termId):', schoolWide.name)
    } else {
      console.log('❌ No school-wide match (no classId, no termId)')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkGradingSystems()
