/**
 * Fix Class Teacher Staff Link
 * Links the user account to their staff profile
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixStaffLink() {
  try {
    const userId = '69a59bae96a95e86777fd893'
    
    console.log('🔍 Checking user and staff records...\n')

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        activeRole: true,
        schoolId: true,
      }
    })

    if (!user) {
      console.log('❌ User not found with ID:', userId)
      return
    }

    console.log('✓ User found:')
    console.log('  ID:', user.id)
    console.log('  Email:', user.email)
    console.log('  Username:', user.username)
    console.log('  Phone:', user.phone)
    console.log('  Role:', user.role)
    console.log('  Active Role:', user.activeRole)
    console.log('  School ID:', user.schoolId)

    // Check if staff record exists with this userId
    const staffByUserId = await prisma.staff.findFirst({
      where: {
        userId: user.id,
        schoolId: user.schoolId
      }
    })

    if (staffByUserId) {
      console.log('\n✓ Staff record already linked to this user!')
      console.log('  Staff ID:', staffByUserId.id)
      console.log('  Name:', staffByUserId.firstName, staffByUserId.lastName)
      return
    }

    console.log('\n❌ No staff record linked to this user')
    console.log('\n🔍 Searching for staff records by email/phone...')

    // Try to find staff by email, username, or phone
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId: user.schoolId,
        OR: [
          { email: user.email },
          { email: user.username },
          { phone: user.phone },
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        primaryRole: true,
        secondaryRoles: true,
        userId: true,
      }
    })

    if (!staff) {
      console.log('\n❌ No staff record found matching user email/phone')
      console.log('\n📋 All staff in this school:')
      
      const allStaff = await prisma.staff.findMany({
        where: { schoolId: user.schoolId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          primaryRole: true,
          userId: true,
        },
        take: 10
      })

      allStaff.forEach(s => {
        console.log(`  - ${s.firstName} ${s.lastName} (${s.email || s.phone}) - Role: ${s.primaryRole} - UserID: ${s.userId || 'NOT LINKED'}`)
      })

      console.log('\n⚠️  SOLUTION: You need to either:')
      console.log('   1. Create a staff record for this user, OR')
      console.log('   2. Link this user to an existing staff record')
      return
    }

    console.log('\n✓ Staff record found:')
    console.log('  Staff ID:', staff.id)
    console.log('  Name:', staff.firstName, staff.lastName)
    console.log('  Email:', staff.email)
    console.log('  Phone:', staff.phone)
    console.log('  Primary Role:', staff.primaryRole)
    console.log('  Secondary Roles:', staff.secondaryRoles)
    console.log('  Current User ID:', staff.userId || 'NOT LINKED')

    if (staff.userId && staff.userId !== user.id) {
      console.log('\n⚠️  WARNING: This staff record is already linked to another user!')
      console.log('   Staff userId:', staff.userId)
      console.log('   Current user:', user.id)
      console.log('\n   Do you want to re-link it? (You need to manually update the script)')
      return
    }

    // Link the staff record to the user
    console.log('\n🔗 Linking staff record to user...')
    
    await prisma.staff.update({
      where: { id: staff.id },
      data: { userId: user.id }
    })

    console.log('✅ SUCCESS! Staff record linked to user account')
    console.log('\n   User ID:', user.id)
    console.log('   Staff ID:', staff.id)
    console.log('   Staff Name:', staff.firstName, staff.lastName)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixStaffLink()
