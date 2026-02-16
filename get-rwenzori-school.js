/**
 * Get Rwenzori Valley Primary School Data
 * 
 * Fetches complete school information including:
 * - School details
 * - Academic years and terms
 * - Classes and subjects
 * - Students count
 * - Staff count
 * - Current active term
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getRwenzoriSchool() {
  try {
    console.log('🔍 Searching for Rwenzori Valley Primary School...\n')

    // Find school by name (case-insensitive search)
    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { name: { contains: 'Rwenzori', mode: 'insensitive' } },
          { name: { contains: 'Valley', mode: 'insensitive' } },
          { code: { contains: 'VALLEY', mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        academicYears: {
          include: {
            terms: {
              orderBy: { startDate: 'asc' },
            },
          },
          orderBy: { startDate: 'desc' },
        },
        classes: {
          include: {
            streams: true,
            _count: {
              select: {
                students: true,
              },
            },
          },
          orderBy: { level: 'asc' },
        },
        subjects: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!school) {
      console.log('❌ School not found!')
      console.log('\n💡 Searching for any active schools...\n')
      
      const allSchools = await prisma.school.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          schoolType: true,
        },
      })

      if (allSchools.length === 0) {
        console.log('❌ No active schools found in database')
      } else {
        console.log(`✅ Found ${allSchools.length} active school(s):\n`)
        allSchools.forEach((s, i) => {
          console.log(`${i + 1}. ${s.name}`)
          console.log(`   Code: ${s.code}`)
          console.log(`   Type: ${s.schoolType}`)
          console.log(`   ID: ${s.id}\n`)
        })
      }
      
      return null
    }

    // Get counts
    const [studentCount, staffCount, teacherCount] = await Promise.all([
      prisma.student.count({ where: { schoolId: school.id, status: 'ACTIVE' } }),
      prisma.staff.count({ where: { schoolId: school.id, status: 'ACTIVE' } }),
      prisma.teacher.count({ where: { schoolId: school.id, employmentStatus: 'ACTIVE' } }),
    ])

    // Find current term
    const today = new Date()
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: school.id,
          isCurrent: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        academicYear: true,
      },
    })

    // Display results
    console.log('✅ School Found!\n')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📚 SCHOOL INFORMATION')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`Name:              ${school.name}`)
    console.log(`Code:              ${school.code}`)
    console.log(`Type:              ${school.schoolType}`)
    console.log(`License:           ${school.licenseType}`)
    console.log(`Active:            ${school.isActive ? '✅ Yes' : '❌ No'}`)
    console.log(`ID:                ${school.id}`)
    console.log(`Created:           ${school.createdAt.toLocaleDateString()}`)
    
    if (school.phone) console.log(`Phone:             ${school.phone}`)
    if (school.email) console.log(`Email:             ${school.email}`)
    if (school.address) console.log(`Address:           ${school.address}`)
    if (school.district) console.log(`District:          ${school.district}`)

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('👥 PEOPLE')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`Active Students:   ${studentCount}`)
    console.log(`Active Staff:      ${staffCount}`)
    console.log(`Active Teachers:   ${teacherCount}`)

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('📅 ACADEMIC YEARS')
    console.log('═══════════════════════════════════════════════════════════')
    
    if (school.academicYears.length === 0) {
      console.log('❌ No academic years found')
    } else {
      school.academicYears.forEach((year, i) => {
        const status = year.isCurrent ? '🟢 CURRENT' : year.isActive ? '🔵 Active' : '⚪ Inactive'
        console.log(`\n${i + 1}. ${year.name} ${status}`)
        console.log(`   Period: ${year.startDate.toLocaleDateString()} - ${year.endDate.toLocaleDateString()}`)
        console.log(`   ID: ${year.id}`)
        
        if (year.terms.length > 0) {
          console.log(`   Terms:`)
          year.terms.forEach((term, j) => {
            const termStatus = term.isCurrent ? '🟢 CURRENT' : '⚪'
            console.log(`     ${j + 1}. ${term.name} ${termStatus}`)
            console.log(`        ${term.startDate.toLocaleDateString()} - ${term.endDate.toLocaleDateString()} (${term.weekCount} weeks)`)
            console.log(`        ID: ${term.id}`)
          })
        }
      })
    }

    if (currentTerm) {
      console.log('\n═══════════════════════════════════════════════════════════')
      console.log('🟢 CURRENT TERM')
      console.log('═══════════════════════════════════════════════════════════')
      console.log(`Term:              ${currentTerm.name}`)
      console.log(`Academic Year:     ${currentTerm.academicYear.name}`)
      console.log(`Period:            ${currentTerm.startDate.toLocaleDateString()} - ${currentTerm.endDate.toLocaleDateString()}`)
      console.log(`Weeks:             ${currentTerm.weekCount}`)
      console.log(`Term ID:           ${currentTerm.id}`)
      console.log(`Year ID:           ${currentTerm.academicYearId}`)
    }

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('🏫 CLASSES')
    console.log('═══════════════════════════════════════════════════════════')
    
    if (school.classes.length === 0) {
      console.log('❌ No classes found')
    } else {
      school.classes.forEach((cls, i) => {
        console.log(`\n${i + 1}. ${cls.name} (Level ${cls.level})`)
        console.log(`   Students: ${cls._count.students}`)
        console.log(`   ID: ${cls.id}`)
        
        if (cls.streams.length > 0) {
          console.log(`   Streams: ${cls.streams.map(s => s.name).join(', ')}`)
        }
      })
    }

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('📖 SUBJECTS')
    console.log('═══════════════════════════════════════════════════════════')
    
    if (school.subjects.length === 0) {
      console.log('❌ No subjects found')
    } else {
      school.subjects.forEach((subject, i) => {
        console.log(`${i + 1}. ${subject.name} (${subject.code}) - ${subject.educationLevel}`)
        console.log(`   ID: ${subject.id}`)
      })
    }

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('💾 EXPORT DATA')
    console.log('═══════════════════════════════════════════════════════════')
    
    const exportData = {
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        schoolType: school.schoolType,
        licenseType: school.licenseType,
      },
      counts: {
        students: studentCount,
        staff: staffCount,
        teachers: teacherCount,
        classes: school.classes.length,
        subjects: school.subjects.length,
        academicYears: school.academicYears.length,
      },
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        academicYearId: currentTerm.academicYearId,
        academicYearName: currentTerm.academicYear.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate,
      } : null,
      classes: school.classes.map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        studentCount: c._count.students,
      })),
      subjects: school.subjects.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
      })),
    }

    console.log('\n📋 Copy this data for use in scripts:\n')
    console.log('const schoolData = ' + JSON.stringify(exportData, null, 2))

    console.log('\n✅ Done!\n')

    return exportData

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
getRwenzoriSchool()
  .then((data) => {
    if (data) {
      console.log('✅ School data retrieved successfully')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
