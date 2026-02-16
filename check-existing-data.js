/**
 * Check Existing Data in Phase 1 Models
 * 
 * Shows how many records exist in each Phase 1 model
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkExistingData() {
  console.log('📊 Checking Existing Data in Phase 1 Models...\n')

  try {
    const school = await prisma.school.findFirst()
    
    if (!school) {
      console.log('❌ No school found!')
      return
    }

    console.log(`School: ${school.name} (${school.code})`)
    console.log(`ID: ${school.id}\n`)

    // Check all Phase 1 models
    const counts = {
      Guardian: await prisma.guardian.count(),
      Term: await prisma.term.count(),
      Stream: await prisma.stream.count(),
      Mark: await prisma.mark.count(),
      Result: await prisma.result.count(),
      Attendance: await prisma.attendance.count(),
      CAEntry: await prisma.cAEntry.count(),
      ExamEntry: await prisma.examEntry.count(),
      DisciplineCase: await prisma.disciplineCase.count(),
      StudentDocument: await prisma.studentDocument.count(),
    }

    console.log('Record Counts:\n')
    Object.entries(counts).forEach(([model, count]) => {
      const icon = count > 0 ? '📊' : '⚪'
      console.log(`${icon} ${model.padEnd(20)} ${count} records`)
    })

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0)
    console.log(`\nTotal Records: ${totalRecords}`)

    // Check if any records have schoolId
    if (counts.Term > 0) {
      const termWithSchoolId = await prisma.term.findFirst({
        where: { schoolId: { not: null } },
      })
      console.log(`\n✅ Term records have schoolId: ${termWithSchoolId ? 'Yes' : 'No'}`)
    }

    if (counts.CAEntry > 0) {
      const caWithSchoolId = await prisma.cAEntry.findFirst({
        where: { schoolId: { not: null } },
      })
      console.log(`✅ CAEntry records have schoolId: ${caWithSchoolId ? 'Yes' : 'No'}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkExistingData()
