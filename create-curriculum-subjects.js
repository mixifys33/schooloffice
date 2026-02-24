const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔧 Creating CurriculumSubject records...\n')

    // Get school
    const school = await prisma.school.findFirst()
    if (!school) {
      console.log('❌ No school found')
      return
    }

    console.log(`School: ${school.name}\n`)

    // Get all classes
    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true }
    })

    // Get all active subjects
    const subjects = await prisma.subject.findMany({
      where: { 
        schoolId: school.id,
        isActive: true
      },
      select: { id: true, name: true, code: true }
    })

    console.log(`Found ${classes.length} classes and ${subjects.length} subjects\n`)

    // Create curriculum subjects for each class-subject combination
    let created = 0
    let skipped = 0

    for (const classData of classes) {
      console.log(`\nProcessing ${classData.name}...`)
      
      for (const subject of subjects) {
        // Check if already exists
        const existing = await prisma.curriculumSubject.findUnique({
          where: {
            classId_subjectId: {
              classId: classData.id,
              subjectId: subject.id
            }
          }
        })

        if (existing) {
          console.log(`  ⏭️  ${subject.name} - already exists`)
          skipped++
          continue
        }

        // Create new curriculum subject
        await prisma.curriculumSubject.create({
          data: {
            schoolId: school.id,
            classId: classData.id,
            subjectId: subject.id,
            isCore: true, // You can adjust this
            caWeight: 40,
            examWeight: 60,
            minPassMark: 50,
            periodsPerWeek: 4,
            isActive: true,
            dosApproved: false
          }
        })

        console.log(`  ✅ ${subject.name} - created`)
        created++
      }
    }

    console.log(`\n✨ Done!`)
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${created + skipped}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
