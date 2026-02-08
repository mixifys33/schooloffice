const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function debugPasswordIssue() {
  try {
    console.log('🔧 Debugging password issue for kimfa9717@gmail.com...')
    
    // Find the user
    const user = await prisma.user.findFirst({
      where: {
        email: 'kimfa9717@gmail.com'
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        forcePasswordReset: true,
        isActive: true,
        failedAttempts: true,
        lockedUntil: true,
        school: {
          select: {
            code: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      hasPasswordHash: !!user.passwordHash,
      hashLength: user.passwordHash ? user.passwordHash.length : 0,
      hashPrefix: user.passwordHash ? user.passwordHash.substring(0, 20) : 'none',
      forcePasswordReset: user.forcePasswordReset,
      isActive: user.isActive,
      failedAttempts: user.failedAttempts,
      lockedUntil: user.lockedUntil,
      school: user.school
    })

    // Test the current password that was provided in the logs
    const providedPassword = 'zBYS6UwG*6!'
    console.log('\n🔧 Testing provided password:', providedPassword)
    
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(providedPassword, user.passwordHash)
      console.log('Password verification result:', isValid)
      
      if (!isValid) {
        console.log('\n❌ Password does not match. Let\'s generate a new one...')
        
        // Generate a new password
        const newPassword = 'TempPass123!'
        const newHash = await bcrypt.hash(newPassword, 12)
        
        console.log('🔧 New password:', newPassword)
        console.log('🔧 New hash:', newHash.substring(0, 20) + '...')
        
        // Update the user with the new password
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newHash,
            forcePasswordReset: true,
            failedAttempts: 0,
            lockedUntil: null
          }
        })
        
        console.log('✅ Password updated successfully!')
        console.log('📧 New login credentials:')
        console.log('   Email:', user.email)
        console.log('   Password:', newPassword)
        console.log('   School Code: VALLEY')
        
        // Verify the new password works
        const verifyNew = await bcrypt.compare(newPassword, newHash)
        console.log('🔧 New password verification:', verifyNew)
      } else {
        console.log('✅ Password is correct! There might be another issue.')
      }
    } else {
      console.log('❌ No password hash found. Setting a new password...')
      
      const newPassword = 'TempPass123!'
      const newHash = await bcrypt.hash(newPassword, 12)
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          forcePasswordReset: true,
          failedAttempts: 0,
          lockedUntil: null
        }
      })
      
      console.log('✅ Password set successfully!')
      console.log('📧 New login credentials:')
      console.log('   Email:', user.email)
      console.log('   Password:', newPassword)
      console.log('   School Code: VALLEY')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPasswordIssue()