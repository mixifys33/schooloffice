/**
 * Check user role for dwightkim12@gmail.com
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserRole() {
  try {
    console.log('Checking user role for dwightkim12@gmail.com...\n')

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: 'dwightkim12@gmail.com'
      },
      select: {
        id: true,
        email: true,
        role: true,
        roles: true,
        activeRole: true,
      }
    })

    if (!user) {
      console.log('❌ User not found with email: dwightkim12@gmail.com')
      return
    }

    console.log('User found:')
    console.log('  Email:', user.email)
    console.log('  Role:', user.role)
    console.log('  Roles array:', user.roles)
    console.log('  Active Role:', user.activeRole)

    // Check if there's a linked teacher/staff record
    const teacher = await prisma.teacher.findFirst({
      where: {
        email: 'dwightkim12@gmail.com'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        classTeacherForIds: true,
        userId: true,
      }
    })

    if (teacher) {
      console.log('\n✓ Teacher record found:')
      console.log('  Name:', teacher.firstName, teacher.lastName)
      console.log('  Job Title:', teacher.jobTitle)
      console.log('  Class Teacher For:', teacher.classTeacherForIds.length, 'class(es)')
      console.log('  Linked User ID:', teacher.userId)
      console.log('  User ID matches:', teacher.userId === user.id ? '✓ Yes' : '✗ No')
    } else {
      console.log('\n❌ No teacher record found')
    }

    // Check staff record
    const staff = await prisma.staff.findFirst({
      where: {
        email: 'dwightkim12@gmail.com'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        userId: true,
      }
    })

    if (staff) {
      console.log('\n✓ Staff record found:')
      console.log('  Name:', staff.firstName, staff.lastName)
      console.log('  Staff Role:', staff.role)
      console.log('  Linked User ID:', staff.userId)
      console.log('  User ID matches:', staff.userId === user.id ? '✓ Yes' : '✗ No')
    } else {
      console.log('\n❌ No staff record found')
    }

    console.log('\n' + '='.repeat(60))
    console.log('DIAGNOSIS:')
    console.log('='.repeat(60))
    
    if (user.role === 'TEACHER' && teacher && teacher.classTeacherForIds.length > 0) {
      console.log('⚠️  ISSUE FOUND:')
      console.log('   User role is TEACHER but should be CLASS_TEACHER')
      console.log('   Teacher has', teacher.classTeacherForIds.length, 'class(es) assigned as class teacher')
      console.log('\n   FIX: Update user.role to CLASS_TEACHER')
    } else if (user.role === 'CLASS_TEACHER') {
      console.log('✓ User role is correctly set to CLASS_TEACHER')
    } else {
      console.log('ℹ️  User role:', user.role)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserRole()
