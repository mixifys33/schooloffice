/**
 * Fix Force Password Reset Flags
 * This script clears forcePasswordReset for users who may have completed password reset
 * but still have the flag set to true
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixForcePasswordResetFlags() {
  try {
    console.log('🔧 Checking users with forcePasswordReset flag...')
    console.log('='.repeat(60))
    
    // Find users with forcePasswordReset = true
    const usersWithForceReset = await prisma.user.findMany({
      where: { 
        forcePasswordReset: true,
        schoolId: '695d70b9fd1c15f57d0ad1f2' // VALLEY school ID
      },
      select: {
        id: true,
        email: true,
        forcePasswordReset: true,
        passwordHash: true
      }
    })
    
    console.log('Users with forcePasswordReset = true:', usersWithForceReset.length)
    console.log('')
    
    if (usersWithForceReset.length === 0) {
      console.log('✅ No users have forcePasswordReset flag set!')
      return
    }
    
    // Show current status
    usersWithForceReset.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   - Force Reset: ${user.forcePasswordReset}`)
      console.log(`   - Has Password: ${!!user.passwordHash}`)
      console.log('')
    })
    
    // Ask if we should clear the flags for users who have passwords
    console.log('🤔 Should we clear forcePasswordReset for users who already have passwords?')
    console.log('   This will allow them to login normally without being forced to reset.')
    console.log('')
    
    // For now, let's clear it for all users who have passwords
    const usersToUpdate = usersWithForceReset.filter(user => !!user.passwordHash)
    
    if (usersToUpdate.length > 0) {
      console.log(`🔧 Clearing forcePasswordReset for ${usersToUpdate.length} users...`)
      
      for (const user of usersToUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { forcePasswordReset: false }
        })
        
        console.log(`  ✅ Cleared flag for: ${user.email}`)
      }
      
      console.log('')
      console.log('✅ All flags cleared!')
    } else {
      console.log('ℹ️  No users need flag clearing (all users without passwords should keep the flag)')
    }
    
    // Verify the fix
    const remainingUsersWithForceReset = await prisma.user.findMany({
      where: { 
        forcePasswordReset: true,
        schoolId: '695d70b9fd1c15f57d0ad1f2'
      }
    })
    
    console.log('')
    console.log('📊 Final Status:')
    console.log('- Users still with forcePasswordReset = true:', remainingUsersWithForceReset.length)
    
    if (remainingUsersWithForceReset.length > 0) {
      console.log('- These users still need to reset their password:')
      remainingUsersWithForceReset.forEach(user => {
        console.log(`  - ${user.email} (${!!user.passwordHash ? 'has password' : 'no password'})`)
      })
    }
    
    console.log('')
    console.log('🎉 Password reset flag fix completed!')
    console.log('')
    console.log('💡 Users can now:')
    console.log('- Complete forgot password flow without being redirected back')
    console.log('- Login normally after password reset')
    console.log('- Access their dashboard without forced password reset')
    
  } catch (error) {
    console.error('❌ Error fixing password reset flags:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixForcePasswordResetFlags()