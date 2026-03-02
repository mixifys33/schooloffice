/**
 * Fix role for dwightkim12@gmail.com
 */

const { PrismaClient, Role } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixRole() {
  try {
    console.log('Updating role for dwightkim12@gmail.com...')

    const result = await prisma.user.updateMany({
      where: {
        email: 'dwightkim12@gmail.com'
      },
      data: {
        role: Role.CLASS_TEACHER,
        roles: [Role.CLASS_TEACHER],
      }
    })

    console.log(`✓ Updated ${result.count} user(s)`)
    console.log('✓ Role changed from TEACHER to CLASS_TEACHER')
    console.log('\nNow when you login, you will be redirected to /class-teacher')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixRole()
