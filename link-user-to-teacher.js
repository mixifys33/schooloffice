/**
 * Link user to existing teacher record
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function linkUserToTeacher() {
  try {
    const userEmail = 'dwightkim12@gmail.com'
    
    console.log('🔍 Finding user and teachers...\n')

    // Get user
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        schoolId: true,
      }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('✓ User found:', user.id)
    console.log('  Email:', user.email)
    console.log('  School ID:', user.schoolId)

    // Get staff profile
    const staff = await prisma.staff.findFirst({
      where: {
        userId: user.id,
        schoolId: user.schoolId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      }
    })

    if (!staff) {
      console.log('\n❌ No staff profile found')
      return
    }

    console.log('\n✓ Staff profile found:', staff.id)
    console.log('  Name:', staff.firstName, staff.lastName)

    // Find all teachers in this school
    const teachers = await prisma.teacher.findMany({
      where: { schoolId: user.schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userId: true,
        assignedClassIds: true,
        classTeacherForIds: true,
      }
    })

    console.log('\n📋 Teachers in school:')
    teachers.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.firstName} ${t.lastName} (${t.email || 'no email'})`)
      console.log(`     - User ID: ${t.userId || 'NOT LINKED'}`)
      console.log(`     - Classes: ${t.assignedClassIds.length}`)
      console.log(`     - Class Teacher For: ${t.classTeacherForIds.length}`)
    })

    // Check if any teacher matches by email
    const matchingTeacher = teachers.find(t => 
      t.email?.toLowerCase() === userEmail.toLowerCase()
    )

    if (matchingTeacher) {
      console.log('\n✓ Found matching teacher by email:', matchingTeacher.id)
      
      if (matchingTeacher.userId && matchingTeacher.userId !== user.id) {
        console.log('⚠️  WARNING: Teacher already linked to different user:', matchingTeacher.userId)
        return
      }

      if (matchingTeacher.userId === user.id) {
        console.log('✓ Teacher already linked to this user')
        return
      }

      // Link teacher to user
      console.log('\n🔗 Linking teacher to user...')
      await prisma.teacher.update({
        where: { id: matchingTeacher.id },
        data: { userId: user.id }
      })

      console.log('✅ SUCCESS! Teacher linked to user')
      console.log('   Teacher:', matchingTeacher.firstName, matchingTeacher.lastName)
      console.log('   User:', user.email)
    } else {
      console.log('\n❌ No teacher found with matching email')
      console.log('   You may need to manually link or create teacher assignments')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

linkUserToTeacher()
