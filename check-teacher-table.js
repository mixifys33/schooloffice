const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacherTable() {
  try {
    const schoolCode = 'HIBNS'
    const teacherId = '69926eac35ac00f3b00e10d7'
    const email = 'dwightkim12@gmail.com'
    
    console.log(`\n🔍 Checking Teacher table (separate from Staff table)\n`)
    
    // Find school
    const school = await prisma.school.findUnique({
      where: { code: schoolCode },
      select: { id: true, name: true }
    })
    
    if (!school) {
      console.log('❌ School not found!')
      return
    }
    
    console.log(`✅ School: ${school.name}\n`)
    
    // Check if Teacher table exists and has data
    try {
      // Check by ID
      console.log('📋 Checking Teacher table by ID...')
      const teacherById = await prisma.teacher.findUnique({
        where: { id: teacherId }
      })
      
      if (teacherById) {
        console.log('✅ FOUND in Teacher table by ID!')
        console.log(JSON.stringify(teacherById, null, 2))
      } else {
        console.log('❌ NOT FOUND in Teacher table by ID')
      }
      
      // Check by email
      console.log('\n📋 Checking Teacher table by email...')
      const teacherByEmail = await prisma.teacher.findFirst({
        where: {
          schoolId: school.id,
          email: email
        }
      })
      
      if (teacherByEmail) {
        console.log('✅ FOUND in Teacher table by email!')
        console.log(JSON.stringify(teacherByEmail, null, 2))
      } else {
        console.log('❌ NOT FOUND in Teacher table by email')
      }
      
      // List all teachers in this school
      console.log('\n📋 All teachers in Teacher table for this school:')
      const allTeachers = await prisma.teacher.findMany({
        where: { schoolId: school.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          employmentStatus: true,
        }
      })
      
      console.log(`Found ${allTeachers.length} teachers:`)
      allTeachers.forEach((t, i) => {
        console.log(`${i + 1}. ${t.firstName} ${t.lastName} - ${t.email} (${t.employmentStatus})`)
      })
      
    } catch (error) {
      if (error.code === 'P2021') {
        console.log('❌ Teacher table does NOT exist in the database!')
        console.log('   This explains why the API returns 404.')
        console.log('   The system expects a Teacher table but it doesn\'t exist.')
      } else {
        throw error
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacherTable()
