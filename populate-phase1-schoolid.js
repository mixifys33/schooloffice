/**
 * Populate schoolId for Phase 1 Models Only
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function populatePhase1() {
  console.log('🔄 Populating schoolId for Phase 1 Models...\n')

  try {
    const school = await prisma.school.findFirst()
    
    if (!school) {
      console.log('❌ No school found!')
      return
    }

    const schoolId = school.id
    console.log(`School: ${school.name} (${school.code})`)
    console.log(`ID: ${schoolId}\n`)

    console.log('Updating records...\n')

    // Update Guardian
    const guardianResult = await prisma.guardian.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ Guardian: ${guardianResult.count} records updated`)

    // Update Term
    const termResult = await prisma.term.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ Term: ${termResult.count} records updated`)

    // Update Stream
    const streamResult = await prisma.stream.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ Stream: ${streamResult.count} records updated`)

    // Update Mark
    const markResult = await prisma.mark.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ Mark: ${markResult.count} records updated`)

    // Update Result
    const resultResult = await prisma.result.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ Result: ${resultResult.count} records updated`)

    // Update Attendance
    const attendanceResult = await prisma.attendance.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ Attendance: ${attendanceResult.count} records updated`)

    // Update CAEntry
    const caResult = await prisma.cAEntry.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ CAEntry: ${caResult.count} records updated`)

    // Update ExamEntry
    const examResult = await prisma.examEntry.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ ExamEntry: ${examResult.count} records updated`)

    // Update DisciplineCase
    const disciplineResult = await prisma.disciplineCase.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ DisciplineCase: ${disciplineResult.count} records updated`)

    // Update StudentDocument
    const docResult = await prisma.studentDocument.updateMany({
      where: { schoolId: null },
      data: { schoolId },
    })
    console.log(`✅ StudentDocument: ${docResult.count} records updated`)

    const total = guardianResult.count + termResult.count + streamResult.count + 
                  markResult.count + resultResult.count + attendanceResult.count +
                  caResult.count + examResult.count + disciplineResult.count + docResult.count

    console.log(`\n🎉 Total: ${total} records updated with schoolId\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

populatePhase1()
