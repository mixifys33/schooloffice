const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function disableForcePasswordReset() {
  try {
    console.log('🔧 Disabling forced password reset for kimfa9717@gmail.com...')
    
    // First find the user to get their ID
    const existingUser = await prisma.user.findFirst({
      where: {
        email: 'kimfa9717@gmail.com'
      },
      select: {
        id: true,
        email: true,
        forcePasswordReset: true
      }
    })

    if (!existingUser) {
      console.log('❌ User not found')
      return
    }

    // Update the user using their ID
    const user = await prisma.user.update({
      where: {
        id: existingUser.id
      },
      data: {
        forcePasswordReset: false
      },
      select: {
        id: true,
        email: true,
        forcePasswordReset: true
      }
    })

    console.log('✅ Force password reset disabled for:', {
      id: user.id,
      email: user.email,
      forcePasswordReset: user.forcePasswordReset
    })

    console.log('\n📧 You can now login directly with:')
    console.log('   Email: kimfa9717@gmail.com')
    console.log('   Password: TempPass123!')
    console.log('   School Code: VALLEY')
    console.log('\n✅ No password reset will be required!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

disableForcePasswordReset()