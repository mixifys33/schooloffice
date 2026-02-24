const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔧 Setting current academic year...\n')

    // Get school
    const school = await prisma.school.findFirst()
    if (!school) {
      console.log('❌ No school found')
      return
    }

    console.log(`School: ${school.name}\n`)

    // Get the academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId: school.id }
    })

    if (!academicYear) {
      console.log('❌ No academic year found')
      return
    }

    console.log(`Found academic year: ${academicYear.name}`)

    // Set it as current
    await prisma.academicYear.update({
      where: { id: academicYear.id },
      data: { isCurrent: true }
    })

    console.log('✅ Set as current academic year\n')

    // Check if there are any terms
    const terms = await prisma.term.findMany({
      where: { academicYearId: academicYear.id },
      orderBy: { startDate: 'asc' }
    })

    if (terms.length === 0) {
      console.log('⚠️ No terms found. Creating default terms...\n')

      // Create 3 terms
      const term1 = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Term 1',
          startDate: new Date('2026-02-09'),
          endDate: new Date('2026-05-15'),
          isCurrent: true
        }
      })
      console.log(`✅ Created ${term1.name} (Current)`)

      const term2 = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Term 2',
          startDate: new Date('2026-05-18'),
          endDate: new Date('2026-08-21'),
          isCurrent: false
        }
      })
      console.log(`✅ Created ${term2.name}`)

      const term3 = await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: 'Term 3',
          startDate: new Date('2026-08-24'),
          endDate: new Date('2026-12-13'),
          isCurrent: false
        }
      })
      console.log(`✅ Created ${term3.name}`)

    } else {
      console.log(`\n📆 Found ${terms.length} terms:`)
      terms.forEach(t => console.log(`  - ${t.name} (Current: ${t.isCurrent})`))

      // Set first term as current if none is current
      const currentTerm = terms.find(t => t.isCurrent)
      if (!currentTerm) {
        await prisma.term.update({
          where: { id: terms[0].id },
          data: { isCurrent: true }
        })
        console.log(`\n✅ Set ${terms[0].name} as current term`)
      }
    }

    console.log('\n✨ Done! Academic year and term are now set up.')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
