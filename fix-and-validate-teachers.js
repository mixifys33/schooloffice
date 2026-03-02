/**
 * Comprehensive script to fix and validate teacher assignments
 * Run with: node fix-and-validate-teachers.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAndValidateTeachers() {
  try {
    console.log('Starting teacher assignment fix and validation...\n')

    // Get all teachers
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        assignedSubjectIds: true,
        assignedClassIds: true,
        assignedStreamIds: true,
        classTeacherForIds: true,
        teacherAssignments: {
          select: {
            id: true,
            subjectId: true,
            classId: true,
          },
        },
      },
    })

    console.log(`Found ${teachers.length} teachers\n`)

    let fixedCount = 0
    let issuesFound = 0

    for (const teacher of teachers) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`${teacher.firstName} ${teacher.lastName}`)
      console.log(`${'='.repeat(60)}`)

      let hasIssues = false
      const fixes = []

      // Check for duplicate class IDs
      const uniqueClasses = [...new Set(teacher.assignedClassIds)]
      if (uniqueClasses.length !== teacher.assignedClassIds.length) {
        hasIssues = true
        issuesFound++
        console.log(`  ⚠️  Found duplicate class IDs`)
        fixes.push('Remove duplicate class IDs')
        
        // Fix: Remove duplicates
        await prisma.teacher.update({
          where: { id: teacher.id },
          data: { assignedClassIds: uniqueClasses },
        })
        teacher.assignedClassIds = uniqueClasses
        console.log(`  ✓ Fixed: Removed duplicates, now ${uniqueClasses.length} unique classes`)
      }

      // Check for duplicate subject IDs
      const uniqueSubjects = [...new Set(teacher.assignedSubjectIds)]
      if (uniqueSubjects.length !== teacher.assignedSubjectIds.length) {
        hasIssues = true
        issuesFound++
        console.log(`  ⚠️  Found duplicate subject IDs`)
        fixes.push('Remove duplicate subject IDs')
        
        // Fix: Remove duplicates
        await prisma.teacher.update({
          where: { id: teacher.id },
          data: { assignedSubjectIds: uniqueSubjects },
        })
        teacher.assignedSubjectIds = uniqueSubjects
        console.log(`  ✓ Fixed: Removed duplicates, now ${uniqueSubjects.length} unique subjects`)
      }

      // Check TeacherAssignment records
      if (teacher.assignedSubjectIds.length > 0 && teacher.assignedClassIds.length > 0) {
        const expectedAssignments = teacher.assignedSubjectIds.length * teacher.assignedClassIds.length
        const actualAssignments = teacher.teacherAssignments.length

        console.log(`\n  Assignments:`)
        console.log(`    Subjects: ${teacher.assignedSubjectIds.length}`)
        console.log(`    Classes: ${teacher.assignedClassIds.length}`)
        console.log(`    Expected records: ${expectedAssignments}`)
        console.log(`    Actual records: ${actualAssignments}`)

        if (actualAssignments !== expectedAssignments) {
          hasIssues = true
          issuesFound++
          console.log(`    ⚠️  Mismatch detected`)
          fixes.push('Recreate TeacherAssignment records')

          // Delete all existing assignments
          if (actualAssignments > 0) {
            await prisma.teacherAssignment.deleteMany({
              where: { teacherId: teacher.id },
            })
            console.log(`    - Deleted ${actualAssignments} old records`)
          }

          // Create new assignments
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
                if (error.code !== 'P2002') {
                  console.error(`    ✗ Failed to create assignment:`, error.message)
                }
              }
            }
          }
          console.log(`    ✓ Created ${createdCount} new records`)
        } else {
          console.log(`    ✓ Records are correct`)
        }
      } else if (teacher.assignedSubjectIds.length === 0 && teacher.assignedClassIds.length === 0) {
        console.log(`\n  No subjects or classes assigned`)
      } else {
        console.log(`\n  ⚠️  Has subjects or classes but not both`)
        console.log(`    Subjects: ${teacher.assignedSubjectIds.length}`)
        console.log(`    Classes: ${teacher.assignedClassIds.length}`)
      }

      // Check class teacher designation
      if (teacher.classTeacherForIds.length > 0) {
        console.log(`\n  Class Teacher For: ${teacher.classTeacherForIds.length} class(es)`)
        
        // Verify all class teacher IDs are in assigned classes
        const invalidClassTeacher = teacher.classTeacherForIds.filter(
          id => !teacher.assignedClassIds.includes(id)
        )
        if (invalidClassTeacher.length > 0) {
          hasIssues = true
          issuesFound++
          console.log(`    ⚠️  Class teacher for classes not assigned: ${invalidClassTeacher.length}`)
          fixes.push('Remove invalid class teacher designations')
          
          const validClassTeacher = teacher.classTeacherForIds.filter(
            id => teacher.assignedClassIds.includes(id)
          )
          await prisma.teacher.update({
            where: { id: teacher.id },
            data: { classTeacherForIds: validClassTeacher },
          })
          console.log(`    ✓ Fixed: Removed ${invalidClassTeacher.length} invalid designations`)
        }
      }

      if (hasIssues) {
        fixedCount++
        console.log(`\n  📝 Fixes applied:`)
        fixes.forEach(fix => console.log(`    - ${fix}`))
      } else {
        console.log(`\n  ✓ No issues found`)
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('SUMMARY')
    console.log(`${'='.repeat(60)}`)
    console.log(`Total teachers: ${teachers.length}`)
    console.log(`Teachers with issues: ${fixedCount}`)
    console.log(`Total issues found and fixed: ${issuesFound}`)
    console.log(`\n✓ All done! Teachers are now properly configured.`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAndValidateTeachers()
