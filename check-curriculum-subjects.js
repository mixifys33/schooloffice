const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Checking CurriculumSubject data...\n')

    // Get school
    const school = await prisma.school.findFirst()
    if (!school) {
      console.log('❌ No school found')
      return
    }

    console.log(`School: ${school.name} (${school.id})\n`)

    // Get all classes
    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true }
    })

    console.log(`📚 Classes (${classes.length}):`)
    classes.forEach(c => console.log(`  - ${c.name} (${c.id})`))
    console.log()

    // Get all subjects
    const subjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, code: true, isActive: true }
    })

    console.log(`📖 Subjects (${subjects.length}):`)
    subjects.forEach(s => console.log(`  - ${s.name} (${s.code}) - Active: ${s.isActive}`))
    console.log()

    // Get all curriculum subjects
    const curriculumSubjects = await prisma.curriculumSubject.findMany({
      where: { schoolId: school.id },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true, code: true, isActive: true } }
      }
    })

    console.log(`🔗 CurriculumSubject records (${curriculumSubjects.length}):`)
    curriculumSubjects.forEach(cs => {
      console.log(`  - ${cs.class.name} → ${cs.subject.name} (${cs.subject.code})`)
      console.log(`    CS Active: ${cs.isActive}, Subject Active: ${cs.subject.isActive}`)
    })
    console.log()

    // Check for FORM 1 specifically
    const form1 = classes.find(c => c.name === 'FORM 1')
    if (form1) {
      console.log(`\n🎯 FORM 1 Curriculum Subjects:`)
      const form1Subjects = curriculumSubjects.filter(cs => cs.classId === form1.id)
      console.log(`  Found ${form1Subjects.length} subjects for FORM 1`)
      form1Subjects.forEach(cs => {
        console.log(`  - ${cs.subject.name} (${cs.subject.code}) - Active: ${cs.isActive}`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
