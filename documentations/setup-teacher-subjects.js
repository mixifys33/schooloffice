/**
 * Setup Teacher Subject Assignments
 * Run this script to assign specific subjects to a teacher
 * 
 * Usage: node setup-teacher-subjects.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function setupTeacherSubjects() {
  try {
    console.log('🔧 Setting up teacher subject assignments...\n')

    // Get the class teacher
    const staff = await prisma.staff.findFirst({
      where: {
        primaryRole: 'CLASS_TEACHER'
      },
      select: {
        id: true,
        user: {
          select: {
            email: true
          }
        }
      }
    })

    if (!staff) {
      console.log('❌ No class teachers found')
      return
    }

    console.log(`✅ Teacher: ${staff.user?.email}`)

    // Check existing subject assignments
    const existingSubjects = await prisma.staffSubject.findMany({
      where: { staffId: staff.id },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } }
      }
    })

    if (existingSubjects.length > 0) {
      console.log(`\n✅ Teacher already has ${existingSubjects.length} subject assignments:`)
      existingSubjects.forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.class.name} - ${a.subject.name}`)
      })
      return
    }

    // Get teacher's class assignment
    const staffClass = await prisma.staffClass.findFirst({
      where: { staffId: staff.id }
    })

    if (!staffClass) {
      console.log('\n❌ Teacher has no class assignment. Please assign a class first.')
      return
    }

    // Get class details
    const classInfo = await prisma.class.findUnique({
      where: { id: staffClass.classId },
      select: { name: true }
    })

    console.log(`\n📚 Assigned class: ${classInfo.name}`)

    // Get available subjects in the class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: staffClass.classId },
      include: {
        subject: { select: { id: true, name: true } }
      },
      take: 3 // Assign first 3 subjects as example
    })

    if (classSubjects.length === 0) {
      console.log('❌ No subjects found in class')
      return
    }

    console.log(`\n🔧 Assigning ${classSubjects.length} subjects...`)

    // Create subject assignments
    for (const cs of classSubjects) {
      await prisma.staffSubject.create({
        data: {
          staffId: staff.id,
          classId: staffClass.classId,
          subjectId: cs.subjectId
        }
      })
      console.log(`   ✅ ${cs.subject.name}`)
    }

    console.log('\n🎉 Success! Teacher can now see these subjects in assessment pages.')
    console.log('   Refresh the browser to see the changes.')

  } catch (error) {
    if (error.message.includes('DNS resolution') || error.message.includes('network')) {
      console.error('\n❌ Network Error: Cannot connect to database')
      console.error('   Please check your internet connection and try again')
    } else {
      console.error('\n❌ Error:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

setupTeacherSubjects()
