/**
 * Check All Users Staff Profiles
 * This script checks which users have staff profiles and which don't
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllUsersStaffProfiles() {
  try {
    console.log('🔍 Checking all users in VALLEY school for staff profiles...')
    console.log('='.repeat(60))
    
    // Get all users in VALLEY school
    const users = await prisma.user.findMany({
      where: { 
        schoolId: '695d70b9fd1c15f57d0ad1f2' // VALLEY school ID
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            primaryRole: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log('Total users found:', users.length)
    console.log('')
    
    let usersWithStaff = 0
    let usersWithoutStaff = 0
    let usersNeedingPasswordReset = 0
    const usersNeedingFix = []
    
    users.forEach((user, index) => {
      const hasStaff = !!user.staff
      const needsReset = user.forcePasswordReset
      
      console.log(`User ${index + 1}:`)
      console.log('  Email:', user.email)
      console.log('  Phone:', user.phone || 'N/A')
      console.log('  Role:', user.role)
      console.log('  Active:', user.isActive)
      console.log('  Force Reset:', needsReset)
      console.log('  Has Staff Profile:', hasStaff ? '✅ YES' : '❌ NO')
      
      if (hasStaff) {
        console.log('  Staff Name:', `${user.staff.firstName} ${user.staff.lastName}`)
        console.log('  Staff Role:', user.staff.role)
        console.log('  Staff Primary Role:', user.staff.primaryRole || 'N/A')
        usersWithStaff++
      } else {
        console.log('  ⚠️  Missing staff profile!')
        usersWithoutStaff++
        usersNeedingFix.push({
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role
        })
      }
      
      if (needsReset) {
        usersNeedingPasswordReset++
      }
      
      console.log('')
    })
    
    console.log('📊 Summary:')
    console.log('- Users with staff profiles:', usersWithStaff)
    console.log('- Users without staff profiles:', usersWithoutStaff)
    console.log('- Users needing password reset:', usersNeedingPasswordReset)
    console.log('')
    
    if (usersWithoutStaff > 0) {
      console.log('⚠️  Some users are missing staff profiles!')
      console.log('   These users will get "No staff profile found" error')
      console.log('   during identity verification.')
      console.log('')
      console.log('🔧 Users needing staff profiles:')
      usersNeedingFix.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.role})`)
      })
    } else {
      console.log('✅ All users have staff profiles!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllUsersStaffProfiles()