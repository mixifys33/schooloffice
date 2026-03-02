/**
 * Test script to verify teacher assignments are being saved correctly
 * Run with: node test-teacher-assignments.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacherAssignments() {
  try {
    console.log('Checking teacher assignments...\n')

    // Get all teachers
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedSubjectIds: true,
        assignedClassIds: true,
        assignedStreamIds: true,
        classTeacherForIds: true,
        teacherAssignments: {
          select: {
            id: true,
            subjectId: true,
            classId: true,
            subject: {
              select: {
                name: true,
                code: true,
              },
            },
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    console.log(`Found ${teachers.length} teachers\n`)

    for (const teacher of teachers) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Teacher: ${teacher.firstName} ${teacher.lastName}`)
      console.log(`${'='.repeat(60)}`)
      
      console.log('\nAssigned Arrays:')
      console.log(`  - Subjects: ${teacher.assignedSubjectIds.length} (${teacher.assignedSubjectIds.join(', ')})`)
      console.log(`  - Classes: ${teacher.assignedClassIds.length} (${teacher.assignedClassIds.join(', ')})`)
      console.log(`  - Streams: ${teacher.assignedStreamIds.length} (${teacher.assignedStreamIds.join(', ')})`)
      console.log(`  - Class Teacher For: ${teacher.classTeacherForIds.length} (${teacher.classTeacherForIds.join(', ')})`)
      
      console.log('\nTeacherAssignment Records:')
      if (teacher.teacherAssignments.length === 0) {
        console.log('  ⚠️  No TeacherAssignment records found!')
      } else {
        teacher.teacherAssignments.forEach((assignment, index) => {
          console.log(`  ${index + 1}. ${assignment.subject.name} (${assignment.subject.code}) → ${assignment.class.name}`)
        })
      }
      
      // Check for mismatches
      const expectedAssignments = teacher.assignedSubjectIds.length * teacher.assignedClassIds.length
      if (teacher.assignedSubjectIds.length > 0 && teacher.assignedClassIds.length > 0) {
        if (teacher.teacherAssignments.length !== expectedAssignments) {
          console.log(`\n  ⚠️  MISMATCH: Expected ${expectedAssignments} assignments, found ${teacher.teacherAssignments.length}`)
        } else {
          console.log(`\n  ✓ Assignment records match expected count`)
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('Summary:')
    console.log(`${'='.repeat(60)}`)
    
    const teachersWithSubjects = teachers.filter(t => t.assignedSubjectIds.length > 0)
    const teachersWithClasses = teachers.filter(t => t.assignedClassIds.length > 0)
    const teachersWithAssignments = teachers.filter(t => t.teacherAssignments.length > 0)
    const classTeachers = teachers.filter(t => t.classTeacherForIds.length > 0)
    
    console.log(`Teachers with subjects: ${teachersWithSubjects.length}`)
    console.log(`Teachers with classes: ${teachersWithClasses.length}`)
    console.log(`Teachers with TeacherAssignment records: ${teachersWithAssignments.length}`)
    console.log(`Class teachers: ${classTeachers.length}`)
    
    if (classTeachers.length > 0) {
      console.log('\nClass Teachers:')
      classTeachers.forEach(t => {
        console.log(`  - ${t.firstName} ${t.lastName}: ${t.classTeacherForIds.length} class(es)`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacherAssignments()
