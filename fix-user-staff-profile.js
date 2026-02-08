/**
 * Fix User Staff Profile
 * Creates missing staff profile for the test user
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixUserStaffProfile() {
  try {
    console.log('🔧 Fixing user staff profile...')
    
    // Find the user
    const user = await prisma.user.findFirst({
      where: { 
        email: 'mixifys33@gmail.com',
        schoolId: '695d70b9fd1c15f57d0ad1f2' // VALLEY school ID
      },
      include: {
        staff: true
      }
    })
    
    if (!user) {
      console.error('❌ User not found!')
      return
    }
    
    console.log('✅ User found:', user.email)
    console.log('- Has staff profile:', !!user.staff)
    console.log('- Force password reset:', user.forcePasswordReset)
    
    if (!user.staff) {
      console.log('🔧 Creating staff profile...')
      
      // Create staff profile
      const staff = await prisma.staff.create({
        data: {
          userId: user.id,
          schoolId: user.schoolId,
          employeeNumber: `TEST${Date.now()}`, // Generate unique employee number
          firstName: 'Test',
          lastName: 'Teacher',
          phone: user.phone,
          email: user.email,
          role: 'TEACHER', // Use Role enum value
          primaryRole: 'CLASS_TEACHER', // Use StaffRole enum value
          isTeacher: true,
          status: 'ACTIVE',
        }
      })
      
      console.log('✅ Staff profile created:', staff.id)
    }
    
    // Update user to force password reset
    if (!user.forcePasswordReset) {
      console.log('🔧 Setting forcePasswordReset to true...')
      
      await prisma.user.update({
        where: { id: user.id },
        data: { forcePasswordReset: true }
      })
      
      console.log('✅ User updated to require password reset')
    }
    
    // Verify the fix
    const updatedUser = await prisma.user.findFirst({
      where: { id: user.id },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            primaryRole: true
          }
        }
      }
    })
    
    console.log('')
    console.log('📊 Final Status:')
    console.log('- User ID:', updatedUser.id)
    console.log('- Email:', updatedUser.email)
    console.log('- Phone:', updatedUser.phone)
    console.log('- Role:', updatedUser.role)
    console.log('- Force Password Reset:', updatedUser.forcePasswordReset)
    console.log('- Has Staff Profile:', !!updatedUser.staff)
    
    if (updatedUser.staff) {
      console.log('- Staff Name:', `${updatedUser.staff.firstName} ${updatedUser.staff.lastName}`)
      console.log('- Staff Phone:', updatedUser.staff.phone)
      console.log('- Staff Role:', updatedUser.staff.role)
      console.log('- Staff Primary Role:', updatedUser.staff.primaryRole)
    }
    
    console.log('')
    console.log('🎉 User is now ready for identity verification!')
    console.log('')
    console.log('📋 Use these details for verification:')
    console.log('- Full Name: Test Teacher')
    console.log('- Email: mixifys33@gmail.com')
    console.log('- Phone: +256700123456')
    console.log('- Role: TEACHER')
    console.log('- School Code: VALLEY')
    console.log('- Temporary Password: TestPassword123!')
    
  } catch (error) {
    console.error('❌ Error fixing user staff profile:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserStaffProfile()