/**
 * Delete staff profile for dwightkim12@gmail.com
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteStaffProfile() {
  try {
    const userEmail = 'dwightkim12@gmail.com'
    
    console.log('🔍 Finding user and staff profile...\n')

    // Get user
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        schoolId: true,
      }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('✓ User found:', user.id)
    console.log('  Email:', user.email)

    // Find staff profile
    const staff = await prisma.staff.findFirst({
      where: {
        userId: user.id,
        schoolId: user.schoolId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeNumber: true,
      }
    })

    if (!staff) {
      console.log('\n❌ No staff profile found for this user')
      return
    }

    console.log('\n✓ Staff profile found:')
    console.log('  ID:', staff.id)
    console.log('  Name:', staff.firstName, staff.lastName)
    console.log('  Employee Number:', staff.employeeNumber)

    // Delete staff profile
    console.log('\n🗑️  Deleting staff profile...')
    await prisma.staff.delete({
      where: { id: staff.id }
    })

    console.log('✅ Staff profile deleted successfully!')
    console.log('\nYou can now refresh the page to test auto-creation and linking.')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteStaffProfile()
