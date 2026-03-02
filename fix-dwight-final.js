/**
 * Fix role for dwightkim12@gmail.com - Final version
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixRole() {
  try {
    console.log('Updating role for dwightkim12@gmail.com...')

    // Find the user first
    const user = await prisma.user.findFirst({
      where: { email: 'dwightkim12@gmail.com' }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('Current role:', user.role)

    // Update using update (not updateMany) with the user ID
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'CLASS_TEACHER',
        roles: ['CLASS_TEACHER'],
      }
    })

    console.log('✓ Role updated to:', updated.role)
    console.log('✓ Roles array:', updated.roles)
    console.log('\n✅ Success! Now when you login, you will be redirected to /class-teacher')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixRole()
