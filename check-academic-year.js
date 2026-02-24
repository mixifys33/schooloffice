const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Checking Academic Year and Term data...\n')

    // Get school
    const school = await prisma.school.findFirst()
    if (!school) {
      console.log('❌ No school found')
      return
    }

    console.log(`School: ${school.name} (${school.id})\n`)

    // Get all academic years
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: school.id },
      orderBy: { startDate: 'desc' }
    })

    console.log(`📅 Academic Years (${academicYears.length}):`)
    academicYears.forEach(ay => {
      console.log(`  - ${ay.name} (${ay.id})`)
      console.log(`    Start: ${ay.startDate.toISOString().split('T')[0]}`)
      console.log(`    End: ${ay.endDate.toISOString().split('T')[0]}`)
      console.log(`    Current: ${ay.isCurrent ? '✅ YES' : '❌ NO'}`)
      console.log()
    })

    // Get current academic year
    const currentAY = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true }
    })

    if (!currentAY) {
      console.log('⚠️ NO CURRENT ACADEMIC YEAR SET!')
      console.log('   You need to set one academic year as current.')
      console.log()
    } else {
      console.log(`✅ Current Academic Year: ${currentAY.name}\n`)

      // Get terms for current academic year
      const terms = await prisma.term.findMany({
        where: { academicYearId: currentAY.id },
        orderBy: { startDate: 'asc' }
      })

      console.log(`📆 Terms for ${currentAY.name} (${terms.length}):`)
      terms.forEach(term => {
        console.log(`  - ${term.name} (${term.id})`)
        console.log(`    Start: ${term.startDate.toISOString().split('T')[0]}`)
        console.log(`    End: ${term.endDate.toISOString().split('T')[0]}`)
        console.log(`    Current: ${term.isCurrent ? '✅ YES' : '❌ NO'}`)
        console.log()
      })

      // Get current term
      const currentTerm = await prisma.term.findFirst({
        where: { academicYearId: currentAY.id, isCurrent: true }
      })

      if (!currentTerm) {
        console.log('⚠️ NO CURRENT TERM SET!')
        console.log('   You need to set one term as current.')
        console.log()
      } else {
        console.log(`✅ Current Term: ${currentTerm.name}\n`)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
