const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllStaff() {
  try {
    const schoolCode = 'HIBNS'
    
    console.log(`\n🔍 Getting ALL staff for school: ${schoolCode}\n`)
    
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
    
    // Get all staff
    const allStaff = await prisma.staff.findMany({
      where: { schoolId: school.id },
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
    
    console.log(`Found ${allStaff.length} staff members:\n`)
    
    allStaff.forEach((s, index) => {
      console.log(`${index + 1}. ${s.firstName} ${s.lastName}`)
      console.log(`   Staff Email: ${s.email}`)
      console.log(`   Staff Phone: ${s.phone}`)
      console.log(`   Status: ${s.status}`)
      console.log(`   User ID: ${s.userId}`)
      
      if (s.user) {
        console.log(`   User Email: ${s.user.email}`)
        console.log(`   User Phone: ${s.user.phone}`)
        console.log(`   Username: ${s.user.username}`)
        console.log(`   Active: ${s.user.isActive}`)
      } else {
        console.log(`   ❌ NO USER LINKED!`)
      }
      console.log('')
    })
    
    // Specifically search for the email
    console.log('\n📋 Searching specifically for "dwightkim12@gmail.com"...')
    const specificStaff = await prisma.staff.findFirst({
      where: {
        schoolId: school.id,
        email: 'dwightkim12@gmail.com'
      }
    })
    
    if (specificStaff) {
      console.log('✅ FOUND!')
      console.log(JSON.stringify(specificStaff, null, 2))
    } else {
      console.log('❌ NOT FOUND in Staff table')
    }
    
    // Check User table too
    const specificUser = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        email: 'dwightkim12@gmail.com'
      }
    })
    
    if (specificUser) {
      console.log('✅ FOUND in User table!')
      console.log(JSON.stringify(specificUser, null, 2))
    } else {
      console.log('❌ NOT FOUND in User table')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllStaff()
