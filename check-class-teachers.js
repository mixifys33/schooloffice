const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkClassTeachers() {
  try {
    console.log('Checking for class teachers...\n')

    // Check teachers with classTeacherForIds
    const teachersWithClassTeacher = await prisma.teacher.findMany({
      where: {
        classTeacherForIds: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        classTeacherForIds: true,
      }
    })

    console.log(`Found ${teachersWithClassTeacher.length} teachers assigned as class teachers:\n`)

    for (const teacher of teachersWithClassTeacher) {
      console.log(`- ${teacher.firstName} ${teacher.lastName} (${teacher.email})`)
      console.log(`  Class Teacher for ${teacher.classTeacherForIds.length} class(es)`)
      
      // Get class names
      const classes = await prisma.class.findMany({
        where: {
          id: { in: teacher.classTeacherForIds }
        },
        select: {
          id: true,
          name: true,
        }
      })
      
      classes.forEach(cls => {
        console.log(`    - ${cls.name} (${cls.id})`)
      })
      console.log('')
    }

    // Also check all teachers
    const allTeachers = await prisma.teacher.count()
    console.log(`\nTotal teachers in database: ${allTeachers}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkClassTeachers()
