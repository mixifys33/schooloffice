/**
 * Reopen Current Term
 * Extends the term end date so teachers can enter marks
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function reopenCurrentTerm() {
  try {
    console.log('🔍 Finding current term...\n')

    // Find the most recent term
    const term = await prisma.term.findFirst({
      orderBy: {
        startDate: 'desc'
      },
      include: {
        academicYear: {
          select: {
            name: true,
            schoolId: true
          }
        }
      }
    })

    if (!term) {
      console.log('❌ No term found in database')
      return
    }

    console.log('📅 Current Term:')
    console.log(`   Name: ${term.name}`)
    console.log(`   Academic Year: ${term.academicYear.name}`)
    console.log(`   Start Date: ${term.startDate.toISOString().split('T')[0]}`)
    console.log(`   End Date: ${term.endDate.toISOString().split('T')[0]}`)
    console.log(`   Status: ${new Date() > term.endDate ? '❌ ENDED' : '✅ ACTIVE'}`)

    if (new Date() <= term.endDate) {
      console.log('\n✅ Term is still active. No changes needed.')
      return
    }

    // Extend term by 3 months
    const newEndDate = new Date()
    newEndDate.setMonth(newEndDate.getMonth() + 3)

    console.log('\n🔧 Extending term end date...')
    console.log(`   New End Date: ${newEndDate.toISOString().split('T')[0]}`)

    const updated = await prisma.term.update({
      where: { id: term.id },
      data: {
        endDate: newEndDate
      }
    })

    console.log('\n✅ Term reopened successfully!')
    console.log('   Teachers can now enter marks.')
    console.log('\n💡 Refresh the CA entry page to see the change.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

reopenCurrentTerm()
