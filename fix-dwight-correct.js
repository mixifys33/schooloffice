/**
 * Fix activeRole for dwightkim12@gmail.com
 * CLASS_TEACHER is a StaffRole, not a Role
 * So we set it in activeRole field, not role field
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixRole() {
  try {
    console.log('Updating activeRole for dwightkim12@gmail.com...')

    // Find the user first
    const user = await prisma.user.findFirst({
      where: { email: 'dwightkim12@gmail.com' }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('Current role:', user.role)
    console.log('Current activeRole:', user.activeRole)

    // Update activeRole to CLASS_TEACHER (StaffRole)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        activeRole: 'CLASS_TEACHER', // This is a StaffRole value
      }
    })

    console.log('✓ activeRole updated to:', updated.activeRole)
    console.log('✓ role remains:', updated.role)
    console.log('\n✅ Success! Now when you login, you will be redirected to /class-teacher')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixRole()
