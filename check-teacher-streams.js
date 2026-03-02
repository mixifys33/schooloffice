/**
 * Check how many streams a teacher has
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacherStreams() {
  try {
    const userEmail = 'dwightkim12@gmail.com'
    
    console.log('🔍 Checking streams for teacher:', userEmail)
    console.log('='.repeat(60))

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

    console.log('\n✓ User found:', user.id)

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { email: userEmail },
          { userId: user.id }
        ],
        schoolId: user.schoolId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        classTeacherForIds: true,
        assignedClassIds: true,
      }
    })

    if (!teacher) {
      console.log('❌ No teacher record found')
      return
    }

    console.log('\n✓ Teacher found:', teacher.firstName, teacher.lastName)
    console.log('  Teacher ID:', teacher.id)
    console.log('  Class Teacher For:', teacher.classTeacherForIds.length, 'class(es)')
    console.log('  Assigned Classes:', teacher.assignedClassIds.length, 'class(es)')

    // Get all unique class IDs
    const allClassIds = [...new Set([...teacher.classTeacherForIds, ...teacher.assignedClassIds])]
    
    console.log('\n' + '='.repeat(60))
    console.log('CLASSES AND STREAMS BREAKDOWN')
    console.log('='.repeat(60))

    for (const classId of allClassIds) {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          streams: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      })

      if (!classData) {
        console.log(`\n❌ Class ${classId} not found`)
        continue
      }

      const isClassTeacher = teacher.classTeacherForIds.includes(classId)
      const isAssigned = teacher.assignedClassIds.includes(classId)

      console.log(`\n📚 ${classData.name}`)
      console.log('   Class ID:', classData.id)
      console.log('   Role:', isClassTeacher ? '👨‍🏫 Class Teacher' : '📖 Subject Teacher')
      console.log('   Streams:', classData.streams.length)
      
      if (classData.streams.length > 0) {
        classData.streams.forEach((stream, index) => {
          console.log(`      ${index + 1}. ${stream.name} (ID: ${stream.id})`)
        })
      } else {
        console.log('      (No streams defined)')
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    
    let totalStreams = 0
    for (const classId of allClassIds) {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: { streams: true }
      })
      if (classData) {
        totalStreams += classData.streams.length
      }
    }

    console.log(`\nTotal Classes: ${allClassIds.length}`)
    console.log(`Total Streams: ${totalStreams}`)
    console.log(`Classes as Class Teacher: ${teacher.classTeacherForIds.length}`)
    console.log(`Classes as Subject Teacher: ${teacher.assignedClassIds.length}`)

    // Check if streams are properly linked
    console.log('\n' + '='.repeat(60))
    console.log('STREAM DETAILS')
    console.log('='.repeat(60))

    for (const classId of allClassIds) {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          streams: {
            include: {
              _count: {
                select: {
                  students: true
                }
              }
            }
          }
        }
      })

      if (classData && classData.streams.length > 0) {
        console.log(`\n${classData.name}:`)
        classData.streams.forEach((stream) => {
          console.log(`  - ${stream.name}`)
          console.log(`    ID: ${stream.id}`)
          console.log(`    Students: ${stream._count.students}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacherStreams()
