const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugAcademicActivation() {
  try {
    console.log('🔍 Debugging Academic Year Activation...\n')

    // Get all academic years
    const academicYears = await prisma.academicYear.findMany({
      include: {
        terms: true,
        school: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📚 Found ${academicYears.length} academic years:\n`)

    academicYears.forEach((year, index) => {
      console.log(`${index + 1}. Academic Year: ${year.name}`)
      console.log(`   School: ${year.school.name}`)
      console.log(`   Status: ${year.isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`)
      console.log(`   Current: ${year.isCurrent ? '✅ YES' : '❌ NO'}`)
      console.log(`   Period: ${year.startDate.toDateString()} - ${year.endDate.toDateString()}`)
      console.log(`   Terms: ${year.terms.length}`)
      
      if (year.terms.length > 0) {
        year.terms.forEach((term, termIndex) => {
          const today = new Date()
          const isCurrentTerm = term.startDate <= today && term.endDate >= today
          console.log(`     ${termIndex + 1}. ${term.name}: ${term.startDate.toDateString()} - ${term.endDate.toDateString()} ${isCurrentTerm ? '🟢 CURRENT' : '⚪ NOT CURRENT'}`)
        })
      }
      console.log('')
    })

    // Check what the current term API would return
    console.log('🔍 Testing current term detection...\n')
    
    for (const year of academicYears) {
      console.log(`Testing school: ${year.school.name}`)
      
      const today = new Date()
      
      // Test the same logic as the API
      const currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId: year.schoolId,
            isActive: true
          },
          startDate: { lte: today },
          endDate: { gte: today }
        },
        include: {
          academicYear: true
        }
      })

      if (currentTerm) {
        console.log(`✅ Current term found: ${currentTerm.name} (${currentTerm.academicYear.name})`)
      } else {
        console.log(`❌ No current term found`)
        
        // Check why
        const activeYear = await prisma.academicYear.findFirst({
          where: {
            schoolId: year.schoolId,
            isActive: true
          }
        })
        
        if (!activeYear) {
          console.log(`   Reason: No active academic year found`)
        } else {
          const termsInRange = await prisma.term.findMany({
            where: {
              academicYearId: activeYear.id,
              startDate: { lte: today },
              endDate: { gte: today }
            }
          })
          
          if (termsInRange.length === 0) {
            console.log(`   Reason: Active year exists but no terms cover today's date`)
          }
        }
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAcademicActivation()