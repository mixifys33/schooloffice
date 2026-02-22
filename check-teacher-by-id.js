const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacherById() {
  try {
    const teacherId = '69926eac35ac00f3b00e10d7' // From the screenshot
    
    console.log(`\n🔍 Checking teacher with ID: ${teacherId}\n`)
    
    // Check Staff table by ID
    const staff = await prisma.staff.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        userId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        status: true,
        primaryRole: true,
        department: true,
        schoolId: true,
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
      console.log('✅ Staff found:')
      console.log(JSON.stringify(staff, null, 2))
      
      console.log('\n📧 Email comparison:')
      console.log(`Staff email: "${staff.email}"`)
      console.log(`Staff email length: ${staff.email?.length || 0}`)
      console.log(`Staff email bytes: ${staff.email ? Buffer.from(staff.email).toString('hex') : 'N/A'}`)
      
      if (staff.user) {
        console.log(`\nUser email: "${staff.user.email}"`)
        console.log(`User email length: ${staff.user.email?.length || 0}`)
        console.log(`User email bytes: ${staff.user.email ? Buffer.from(staff.user.email).toString('hex') : 'N/A'}`)
      }
      
      // Test the exact query from forgot password
      console.log('\n🔍 Testing forgot password query...')
      const testEmail = 'dwightkim12@gmail.com'
      
      const userByEmail = await prisma.user.findFirst({
        where: {
          schoolId: staff.schoolId,
          OR: [
            { email: testEmail.toLowerCase() },
            { phone: '0761000880' },
            { username: testEmail.toLowerCase() },
          ],
          isActive: true,
        }
      })
      
      console.log(`Query for email "${testEmail}": ${userByEmail ? 'FOUND' : 'NOT FOUND'}`)
      
      const staffByEmail = await prisma.staff.findFirst({
        where: {
          schoolId: staff.schoolId,
          OR: [
            { email: testEmail.toLowerCase() },
            { phone: '0761000880' },
          ],
          status: 'ACTIVE',
        }
      })
      
      console.log(`Query for staff email "${testEmail}": ${staffByEmail ? 'FOUND' : 'NOT FOUND'}`)
      
    } else {
      console.log('❌ Staff NOT found with that ID')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacherById()
