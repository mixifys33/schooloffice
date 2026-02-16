const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTeacherPasswordReset() {
  try {
    console.log('🔍 Checking teachers with forcePasswordReset flag...\n')

    // Find all users with forcePasswordReset = true
    const usersWithReset = await prisma.user.findMany({
      where: {
        forcePasswordReset: true,
        role: 'TEACHER'
      },
      select: {
        id: true,
        email: true,
        phone: true,
        forcePasswordReset: true,
        createdAt: true,
        updatedAt: true,
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

    console.log(`Found ${usersWithReset.length} teacher(s) with forcePasswordReset = true:\n`)

    if (usersWithReset.length === 0) {
      console.log('✅ No teachers found with forcePasswordReset flag set to true')
      console.log('   All teachers should be able to access their dashboard normally.')
      return
    }

    usersWithReset.forEach((user, index) => {
      const fullName = user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : 'N/A'
      console.log(`${index + 1}. Teacher: ${fullName}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Phone: ${user.phone || 'N/A'}`)
      console.log(`   User ID: ${user.id}`)
      if (user.staff) {
        console.log(`   Staff Role: ${user.staff.role}`)
        console.log(`   Staff ID: ${user.staff.id}`)
      }
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Updated: ${user.updatedAt}`)
      console.log(`   Force Password Reset: ${user.forcePasswordReset}`)
      console.log('')
    })

    console.log('\n📋 EXPLANATION:')
    console.log('   Teachers with forcePasswordReset = true will see the password reset form')
    console.log('   instead of their dashboard. This is a security feature for new accounts.')
    console.log('')
    console.log('   To fix this issue, the teacher must:')
    console.log('   1. Complete the password reset process shown on the screen')
    console.log('   2. Verify their identity with name, email, and temporary password')
    console.log('   3. Create a new secure password')
    console.log('')
    console.log('   If the teacher has already reset their password but the flag is still true,')
    console.log('   you can manually clear it by running: node clear-password-reset-flag.js <email>')

  } catch (error) {
    console.error('❌ Error checking teacher password reset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacherPasswordReset()
