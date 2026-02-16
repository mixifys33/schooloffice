/**
 * Find a teacher with subject assignments
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findTeacherWithSubjects() {
  try {
    // Find all teachers with subject assignments
    const teachersWithSubjects = await prisma.staff.findMany({
      where: {
        staffSubjects: {
          some: {},
        },
      },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
        staffSubjects: {
          include: {
            subject: {
              select: {
                name: true,
                code: true,
              },
            },
            class: {
              select: {
                name: true,
                level: true,
              },
            },
          },
        },
        staffClasses: {
          include: {
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    console.log(`\n✅ Found ${teachersWithSubjects.length} teacher(s) with subject assignments\n`)

    teachersWithSubjects.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.firstName} ${teacher.lastName}`)
      console.log(`   Email: ${teacher.user?.email || 'N/A'}`)
      console.log(`   Role: ${teacher.role} / ${teacher.primaryRole}`)
      console.log(`   Subject Assignments: ${teacher.staffSubjects.length}`)
      console.log(`   Class Assignments: ${teacher.staffClasses.length}`)
      
      if (teacher.staffSubjects.length > 0) {
        console.log(`\n   Assigned Subjects:`)
        teacher.staffSubjects.forEach(ss => {
          console.log(`   - ${ss.subject.name} (${ss.subject.code}) in ${ss.class.name}`)
        })
      }
      
      if (teacher.staffClasses.length > 0) {
        console.log(`\n   Assigned Classes:`)
        teacher.staffClasses.forEach(sc => {
          console.log(`   - ${sc.class.name}`)
        })
      }
      
      console.log('\n' + '-'.repeat(80) + '\n')
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

findTeacherWithSubjects()
