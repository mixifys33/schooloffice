const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacher() {
  try {
    const email = 'dwightkim12@gmail.com'
    const schoolCode = 'HIBNS'
    
    console.log(`\n🔍 Checking for teacher with email: ${email}`)
    console.log(`🔍 School code: ${schoolCode}\n`)
    
    // Find school
    const school = await prisma.school.findUnique({
      where: { code: schoolCode },
      select: { id: true, name: true }
    })
    
    if (!school) {
      console.log('❌ School not found!')
      return
    }
    
    console.log(`✅ School found: ${school.name} (ID: ${school.id})\n`)
    
    // Check User table
    console.log('📋 Checking User table...')
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: email.toLowerCase() },
          { email: email },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        isActive: true,
      }
    })
    
    if (user) {
      console.log('✅ User found in User table:')
      console.log(JSON.stringify(user, null, 2))
    } else {
      console.log('❌ User NOT found in User table')
    }
    
    // Check Staff table
    console.log('\n📋 Checking Staff table...')
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: email.toLowerCase() },
          { email: email },
        ],
      },
      select: {
        id: true,
        userId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            isActive: true,
          }
        }
      }
    })
    
    if (staff) {
      console.log('✅ Staff found in Staff table:')
      console.log(JSON.stringify(staff, null, 2))
    } else {
      console.log('❌ Staff NOT found in Staff table')
    }
    
    // Check all staff emails for this school
    console.log('\n📋 All staff emails in this school:')
    const allStaff = await prisma.staff.findMany({
      where: { schoolId: school.id },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
      take: 20
    })
    
    console.log(`Found ${allStaff.length} staff members:`)
    allStaff.forEach(s => {
      console.log(`  - ${s.firstName} ${s.lastName}: ${s.email} (${s.status})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacher()
