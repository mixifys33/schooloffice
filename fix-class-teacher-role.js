/**
 * Fix user role for class teachers
 * Updates users who are assigned as class teachers but have TEACHER role
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixClassTeacherRoles() {
  try {
    console.log('Finding teachers who should be class teachers...\n')

    // Find all teachers who are assigned as class teachers
    const classTeachers = await prisma.teacher.findMany({
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
        userId: true,
        classTeacherForIds: true,
      }
    })

    console.log(`Found ${classTeachers.length} teachers with class teacher assignments\n`)

    let fixedCount = 0

    for (const teacher of classTeachers) {
      console.log(`\nChecking: ${teacher.firstName} ${teacher.lastName} (${teacher.email})`)
      console.log(`  Class teacher for ${teacher.classTeacherForIds.length} class(es)`)

      if (!teacher.userId) {
        console.log(`  ⚠️  No linked user account`)
        continue
      }

      // Check user's current role
      const user = await prisma.user.findUnique({
        where: { id: teacher.userId },
        select: {
          id: true,
          email: true,
          role: true,
          roles: true,
        }
      })

      if (!user) {
        console.log(`  ⚠️  User account not found`)
        continue
      }

      console.log(`  Current role: ${user.role}`)

      if (user.role === 'CLASS_TEACHER') {
        console.log(`  ✓ Already set to CLASS_TEACHER`)
        continue
      }

      // Update user role to CLASS_TEACHER
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'CLASS_TEACHER',
          roles: ['CLASS_TEACHER'], // Update roles array too
        }
      })

      console.log(`  ✓ Updated role from ${user.role} to CLASS_TEACHER`)
      fixedCount++
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('SUMMARY')
    console.log(`${'='.repeat(60)}`)
    console.log(`Total class teachers found: ${classTeachers.length}`)
    console.log(`Roles updated: ${fixedCount}`)
    console.log(`\n✓ Done! Class teachers will now be redirected to /class-teacher on login`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixClassTeacherRoles()
