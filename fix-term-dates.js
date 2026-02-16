/**
 * Fix Term Dates - Set term to current period
 * Makes the term active so teachers can enter marks
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixTermDates() {
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
            name: true
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

    const today = new Date()
    console.log(`   Today: ${today.toISOString().split('T')[0]}`)

    // Check if term is active
    if (today >= term.startDate && today <= term.endDate) {
      console.log('\n✅ Term is already active. No changes needed.')
      return
    }

    // Set term to start 1 month ago and end 2 months from now
    const newStartDate = new Date()
    newStartDate.setMonth(newStartDate.getMonth() - 1)
    newStartDate.setHours(0, 0, 0, 0)

    const newEndDate = new Date()
    newEndDate.setMonth(newEndDate.getMonth() + 2)
    newEndDate.setHours(23, 59, 59, 999)

    console.log('\n🔧 Updating term dates to make it active...')
    console.log(`   New Start Date: ${newStartDate.toISOString().split('T')[0]}`)
    console.log(`   New End Date: ${newEndDate.toISOString().split('T')[0]}`)

    const updated = await prisma.term.update({
      where: { id: term.id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate
      }
    })

    console.log('\n✅ Term dates updated successfully!')
    console.log('   The term is now ACTIVE.')
    console.log('   Teachers can now enter marks.')
    console.log('\n💡 Refresh the CA entry page to see the change.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixTermDates()
