const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setCurrentAcademicYear() {
  try {
    console.log('Finding academic years...')
    
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { createdAt: 'desc' }
    })

    if (academicYears.length === 0) {
      console.log('No academic years found!')
      return
    }

    console.log('\nFound academic years:')
    academicYears.forEach((ay, index) => {
      console.log(`${index + 1}. ${ay.name} (ID: ${ay.id}) - isCurrent: ${ay.isCurrent}`)
    })

    // Set the most recent one as current
    const mostRecent = academicYears[0]
    
    console.log(`\nSetting "${mostRecent.name}" as current...`)
    
    // First, set all to false
    await prisma.academicYear.updateMany({
      data: { isCurrent: false }
    })
    
    // Then set the most recent to true
    await prisma.academicYear.update({
      where: { id: mostRecent.id },
      data: { isCurrent: true }
    })

    console.log('✓ Academic year set as current!')

    // Now find and set current term
    console.log('\nFinding terms in this academic year...')
    const terms = await prisma.term.findMany({
      where: { academicYearId: mostRecent.id },
      orderBy: { createdAt: 'desc' }
    })

    if (terms.length === 0) {
      console.log('No terms found in this academic year!')
      return
    }

    console.log('\nFound terms:')
    terms.forEach((term, index) => {
      console.log(`${index + 1}. ${term.name} (ID: ${term.id}) - isCurrent: ${term.isCurrent}`)
    })

    const mostRecentTerm = terms[0]
    
    console.log(`\nSetting "${mostRecentTerm.name}" as current...`)
    
    // First, set all terms in this academic year to false
    await prisma.term.updateMany({
      where: { academicYearId: mostRecent.id },
      data: { isCurrent: false }
    })
    
    // Then set the most recent to true
    await prisma.term.update({
      where: { id: mostRecentTerm.id },
      data: { isCurrent: true }
    })

    console.log('✓ Term set as current!')
    console.log('\n✓ All done! Your academic year and term are now set as current.')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setCurrentAcademicYear()
