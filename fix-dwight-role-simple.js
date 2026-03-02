/**
 * Fix role for dwightkim12@gmail.com - Simple version
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixRole() {
  try {
    console.log('Updating role for dwightkim12@gmail.com...')

    // First, find the user
    const user = await prisma.user.findFirst({
      where: { email: 'dwightkim12@gmail.com' }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('Current role:', user.role)

    // Update using the exact enum value from the database
    await prisma.$executeRaw`
      UPDATE User 
      SET role = 'CLASS_TEACHER', roles = '["CLASS_TEACHER"]'
      WHERE email = 'dwightkim12@gmail.com'
    `

    console.log('✓ Role updated to CLASS_TEACHER')
    console.log('\nNow when you login, you will be redirected to /class-teacher')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixRole()
