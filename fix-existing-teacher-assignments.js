/**
 * Script to fix existing teachers with missing TeacherAssignment records
 * Run with: node fix-existing-teacher-assignments.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixTeacherAssignments() {
  try {
    console.log('Fixing teacher assignments...\n')

    // Get all teachers with subjects and classes assigned
    const teachers = await prisma.teacher.findMany({
      where: {
        AND: [
          { assignedSubjectIds: { isEmpty: false } },
          { assignedClassIds: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        assignedSubjectIds: true,
        assignedClassIds: true,
        teacherAssignments: {
          select: {
            id: true,
          },
        },
      },
    })

    console.log(`Found ${teachers.length} teachers with subjects and classes assigned\n`)

    let fixedCount = 0
    let skippedCount = 0

    for (const teacher of teachers) {
      const expectedAssignments = teacher.assignedSubjectIds.length * teacher.assignedClassIds.length
      const actualAssignments = teacher.teacherAssignments.length

      console.log(`\nProcessing: ${teacher.firstName} ${teacher.lastName}`)
      console.log(`  Subjects: ${teacher.assignedSubjectIds.length}`)
      console.log(`  Classes: ${teacher.assignedClassIds.length}`)
      console.log(`  Expected assignments: ${expectedAssignments}`)
      console.log(`  Actual assignments: ${actualAssignments}`)

      if (actualAssignments === expectedAssignments) {
        console.log(`  ✓ Already correct, skipping`)
        skippedCount++
        continue
      }

      // Delete existing assignments
      if (actualAssignments > 0) {
        await prisma.teacherAssignment.deleteMany({
          where: {
            teacherId: teacher.id,
          },
        })
        console.log(`  - Deleted ${actualAssignments} old assignments`)
      }

      // Create new assignments for each subject-class combination
      let createdCount = 0
      for (const subjectId of teacher.assignedSubjectIds) {
        for (const classId of teacher.assignedClassIds) {
          try {
            await prisma.teacherAssignment.create({
              data: {
                schoolId: teacher.schoolId,
                teacherId: teacher.id,
                subjectId,
                classId,
              },
            })
            createdCount++
          } catch (error) {
            // Ignore duplicate errors
            if (error.code !== 'P2002') {
              console.error(`  ✗ Failed to create assignment for subject ${subjectId} and class ${classId}:`, error.message)
            }
          }
        }
      }

      console.log(`  ✓ Created ${createdCount} new assignments`)
      fixedCount++
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('Summary:')
    console.log(`${'='.repeat(60)}`)
    console.log(`Teachers processed: ${teachers.length}`)
    console.log(`Teachers fixed: ${fixedCount}`)
    console.log(`Teachers skipped (already correct): ${skippedCount}`)
    console.log('\n✓ Done! Run test-teacher-assignments.js to verify.')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTeacherAssignments()
