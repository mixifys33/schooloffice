/**
 * Check Academic Year and Terms
 * Shows the full structure of academic year and its terms
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAcademicYearTerms() {
  try {
    console.log('🔍 Checking Academic Year and Terms...\n')

    // Find current academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        isCurrent: true
      },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc'
          }
        }
      }
    })

    if (!academicYear) {
      console.log('❌ No current academic year found')
      return
    }

    const today = new Date()
    console.log('📅 Today:', today.toISOString().split('T')[0])
    console.log('\n📚 Academic Year:')
    console.log(`   Name: ${academicYear.name}`)
    console.log(`   Start Date: ${academicYear.startDate.toISOString().split('T')[0]}`)
    console.log(`   End Date: ${academicYear.endDate.toISOString().split('T')[0]}`)
    console.log(`   Is Current: ${academicYear.isCurrent}`)
    console.log(`   Status: ${today >= academicYear.startDate && today <= academicYear.endDate ? '✅ ACTIVE' : '❌ NOT ACTIVE'}`)

    console.log('\n📖 Terms:')
    academicYear.terms.forEach((term, index) => {
      const isActive = today >= term.startDate && today <= term.endDate
      console.log(`\n   ${index + 1}. ${term.name}`)
      console.log(`      Start: ${term.startDate.toISOString().split('T')[0]}`)
      console.log(`      End: ${term.endDate.toISOString().split('T')[0]}`)
      console.log(`      Status: ${isActive ? '✅ ACTIVE' : '❌ NOT ACTIVE'}`)
    })

    // Find which term should be active
    const activeTerm = academicYear.terms.find(term => 
      today >= term.startDate && today <= term.endDate
    )

    if (activeTerm) {
      console.log('\n✅ Active Term Found:', activeTerm.name)
    } else {
      console.log('\n⚠️  No active term found!')
      console.log('   Today is not within any term dates.')
      console.log('   You need to adjust term dates to include today.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAcademicYearTerms()
