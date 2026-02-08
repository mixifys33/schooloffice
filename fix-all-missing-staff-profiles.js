/**
 * Fix All Missing Staff Profiles
 * This script creates staff profiles for existing users who don't have them
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAllMissingStaffProfiles() {
  try {
    console.log('🔧 Fixing all missing staff profiles in VALLEY school...')
    console.log('='.repeat(60))
    
    // Find users without staff profiles
    const usersWithoutStaff = await prisma.user.findMany({
      where: { 
        schoolId: '695d70b9fd1c15f57d0ad1f2', // VALLEY school ID
        staff: null // Users without staff profiles
      }
    })
    
    console.log('Users without staff profiles:', usersWithoutStaff.length)
    
    if (usersWithoutStaff.length === 0) {
      console.log('✅ All users already have staff profiles!')
      return
    }
    
    console.log('')
    
    for (const user of usersWithoutStaff) {
      console.log(`🔧 Creating staff profile for: ${user.email}`)
      
      // Determine staff role based on user role
      let staffPrimaryRole = null
      switch (user.role) {
        case 'TEACHER':
          staffPrimaryRole = 'CLASS_TEACHER'
          break
        case 'DOS':
          staffPrimaryRole = 'DOS'
          break
        case 'ACCOUNTANT':
          staffPrimaryRole = 'BURSAR'
          break
        default:
          staffPrimaryRole = null // For SCHOOL_ADMIN, DEPUTY, etc.
      }
      
      // Generate names from email (fallback)
      const emailPart = user.email.split('@')[0]
      const firstName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1, 5)
      const lastName = 'User'
      
      try {
        const staff = await prisma.staff.create({
          data: {
            userId: user.id,
            schoolId: user.schoolId,
            employeeNumber: `EMP${Date.now()}${Math.floor(Math.random() * 100)}`,
            firstName: firstName,
            lastName: lastName,
            phone: user.phone,
            email: user.email,
            role: user.role,
            primaryRole: staffPrimaryRole,
            isTeacher: user.role === 'TEACHER',
            status: 'ACTIVE',
          }
        })
        
        console.log(`  ✅ Staff profile created: ${staff.id}`)
        console.log(`  - Name: ${firstName} ${lastName}`)
        console.log(`  - Role: ${user.role}`)
        console.log(`  - Primary Role: ${staffPrimaryRole || 'N/A'}`)
        
      } catch (error) {
        console.error(`  ❌ Failed to create staff profile for ${user.email}:`, error.message)
      }
      
      console.log('')
    }
    
    // Verify the fix
    console.log('🔍 Verifying all users now have staff profiles...')
    const remainingUsersWithoutStaff = await prisma.user.findMany({
      where: { 
        schoolId: '695d70b9fd1c15f57d0ad1f2',
        staff: null
      }
    })
    
    console.log('Users still without staff profiles:', remainingUsersWithoutStaff.length)
    
    if (remainingUsersWithoutStaff.length === 0) {
      console.log('✅ All users now have staff profiles!')
    } else {
      console.log('❌ Some users still missing staff profiles:')
      remainingUsersWithoutStaff.forEach(user => {
        console.log(`  - ${user.email}`)
      })
    }
    
    console.log('')
    console.log('🎉 Staff profile fix completed!')
    console.log('')
    console.log('📋 Users can now use identity verification with:')
    console.log('- Their registered email')
    console.log('- Their registered phone number')
    console.log('- Their full name (as created above)')
    console.log('- Their role')
    console.log('- School code: VALLEY')
    console.log('- Their temporary password')
    
  } catch (error) {
    console.error('❌ Error fixing staff profiles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAllMissingStaffProfiles()