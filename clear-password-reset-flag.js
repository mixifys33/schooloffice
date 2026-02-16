const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearPasswordResetFlag() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ Error: Please provide an email address')
    console.log('Usage: node clear-password-reset-flag.js <email>')
    console.log('Example: node clear-password-reset-flag.js teacher@example.com')
    process.exit(1)
  }

  try {
    console.log(`🔍 Looking for user with email: ${email}...\n`)

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        forcePasswordReset: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    if (!user) {
      console.error(`❌ User not found with email: ${email}`)
      process.exit(1)
    }

    const fullName = user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : 'N/A'
    console.log('✅ User found:')
    console.log(`   Name: ${fullName}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Phone: ${user.phone || 'N/A'}`)
    console.log(`   Role: ${user.role}`)
    if (user.staff) {
      console.log(`   Staff: ${user.staff.firstName} ${user.staff.lastName} (${user.staff.role})`)
    }
    console.log(`   Current forcePasswordReset: ${user.forcePasswordReset}`)
    console.log('')

    if (!user.forcePasswordReset) {
      console.log('ℹ️  The forcePasswordReset flag is already set to false.')
      console.log('   This user should be able to access their dashboard normally.')
      return
    }

    // Update the user
    console.log('🔄 Clearing forcePasswordReset flag...')
    
    await prisma.user.update({
      where: { id: user.id },
      data: { forcePasswordReset: false }
    })

    console.log('✅ Successfully cleared forcePasswordReset flag!')
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('   1. Ask the teacher to log out completely')
    console.log('   2. Clear browser cache/cookies (or use incognito mode)')
    console.log('   3. Log in again with their current password')
    console.log('   4. They should now see their dashboard instead of the password reset form')

  } catch (error) {
    console.error('❌ Error clearing password reset flag:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearPasswordResetFlag()
