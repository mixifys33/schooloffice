/**
 * Test script to verify Class Teacher Dashboard functionality
 * This script tests the dashboard API endpoint and data fetching
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testClassTeacherDashboard() {
  try {
    console.log('🔍 Testing Class Teacher Dashboard...')

    // Find a staff member with CLASS_TEACHER role
    const staff = await prisma.staff.findFirst({
      where: {
        OR: [
          { primaryRole: 'CLASS_TEACHER' },
          { secondaryRoles: { has: 'CLASS_TEACHER' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        primaryRole: true,
        secondaryRoles: true
      }
    })

    if (!staff) {
      console.log('❌ No staff with CLASS_TEACHER role found')
      return
    }

    console.log(`✅ Found staff: ${staff.firstName} ${staff.lastName} (${staff.id})`)

    // Check for class assignments
    const classTeacherResponsibility = await prisma.staffResponsibility.findFirst({
      where: {
        staffId: staff.id,
        type: 'CLASS_TEACHER_DUTY',
      },
    })

    console.log('📋 Class Teacher Responsibility:', classTeacherResponsibility ? 'Found' : 'Not found')

    // Check staffClasses
    const staffClass = await prisma.staffClass.findFirst({
      where: { staffId: staff.id },
      select: { classId: true },
    })

    console.log('🏫 Staff Class Assignment:', staffClass ? 'Found' : 'Not found')

    // Check Teacher model
    const teacher = await prisma.teacher.findFirst({
      where: { 
        schoolId: staff.schoolId,
        OR: [
          { firstName: staff.firstName, lastName: staff.lastName }
        ]
      },
      select: { 
        classTeacherForIds: true,
        assignedClassIds: true 
      }
    })

    console.log('👨‍🏫 Teacher Model:', teacher ? 'Found' : 'Not found')
    if (teacher) {
      console.log('   - Class Teacher For:', teacher.classTeacherForIds.length, 'classes')
      console.log('   - Assigned Classes:', teacher.assignedClassIds.length, 'classes')
    }

    // Get class information if available
    let classId = null
    if (classTeacherResponsibility) {
      const details = classTeacherResponsibility.details
      classId = details?.classId || null
    } else if (staffClass) {
      classId = staffClass.classId
    } else if (teacher && teacher.classTeacherForIds.length > 0) {
      classId = teacher.classTeacherForIds[0]
    } else if (teacher && teacher.assignedClassIds.length > 0) {
      classId = teacher.assignedClassIds[0]
    }

    if (classId) {
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { 
          id: true, 
          name: true, 
          level: true,
          streams: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  students: {
                    where: {
                      status: 'ACTIVE'
                    }
                  }
                }
              }
            }
          }
        },
      })

      console.log('🎓 Class Information:')
      console.log(`   - Name: ${classInfo?.name}`)
      console.log(`   - Level: ${classInfo?.level}`)
      console.log(`   - Streams: ${classInfo?.streams?.length || 0}`)
      
      if (classInfo?.streams) {
        classInfo.streams.forEach(stream => {
          console.log(`     * ${stream.name}: ${stream._count.students} students`)
        })
      }

      // Test student count
      const totalStudents = await prisma.student.count({
        where: { classId, status: 'ACTIVE' },
      })
      console.log(`   - Total Students: ${totalStudents}`)

      // Test attendance for today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const attendanceRecords = await prisma.attendance.findMany({
        where: { classId, date: today },
        select: { status: true, studentId: true },
        distinct: ['studentId'],
      })
      console.log(`   - Attendance Records Today: ${attendanceRecords.length}`)

      // Test fee defaulters
      const feeDefaulters = await prisma.studentAccount.count({
        where: {
          student: { classId, status: 'ACTIVE' },
          balance: { gt: 0 },
        },
      })
      console.log(`   - Fee Defaulters: ${feeDefaulters}`)

    } else {
      console.log('❌ No class assigned to this staff member')
    }

    console.log('✅ Dashboard test completed successfully')

  } catch (error) {
    console.error('❌ Error testing dashboard:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testClassTeacherDashboard()