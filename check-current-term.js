const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCurrentTerm() {
  try {
    console.log('🔍 Checking for current academic year and term...\n')
    
    // Get all academic years
    const academicYears = await prisma.academicYear.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        schoolId: true,
      },
      orderBy: { startDate: 'desc' },
    })
    
    console.log('📅 Academic Years:')
    academicYears.forEach(year => {
      console.log(`  - ${year.name} (${year.startDate.toLocaleDateString()} - ${year.endDate.toLocaleDateString()})`)
      console.log(`    isCurrent: ${year.isCurrent}`)
      console.log(`    schoolId: ${year.schoolId}`)
      console.log(`    id: ${year.id}\n`)
    })
    
    // Get current academic year
    const currentYear = academicYears.find(y => y.isCurrent)
    
    if (!currentYear) {
      console.log('❌ No current academic year found (isCurrent = true)')
      console.log('💡 You need to set one academic year as current\n')
    } else {
      console.log(`✅ Current Academic Year: ${currentYear.name}\n`)
      
      // Get all terms for current year
      const terms = await prisma.term.findMany({
        where: {
          academicYearId: currentYear.id,
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
        },
        orderBy: { startDate: 'asc' },
      })
      
      console.log('📆 Terms in current academic year:')
      terms.forEach(term => {
        console.log(`  - ${term.name} (${term.startDate.toLocaleDateString()} - ${term.endDate.toLocaleDateString()})`)
        console.log(`    isCurrent: ${term.isCurrent}`)
        console.log(`    id: ${term.id}\n`)
      })
      
      const currentTerm = terms.find(t => t.isCurrent)
      
      if (!currentTerm) {
        console.log('❌ No current term found (isCurrent = true)')
        console.log('💡 You need to set one term as current\n')
      } else {
        console.log(`✅ Current Term: ${currentTerm.name}`)
        console.log(`   ID: ${currentTerm.id}`)
        console.log(`   Dates: ${currentTerm.startDate.toLocaleDateString()} - ${currentTerm.endDate.toLocaleDateString()}\n`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCurrentTerm()
