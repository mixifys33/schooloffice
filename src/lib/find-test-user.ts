import { prisma } from '@/lib/db'

async function findTestUser() {
  try {
    console.log('🔍 Searching for test users...')
    
    // Find schools
    const schools = await prisma.school.findMany({
      take: 5,
      select: {
        id: true,
        code: true,
        name: true
      }
    })
    
    console.log('🏫 Found schools:', schools)
    
    if (schools.length === 0) {
      console.log('❌ No schools found in database')
      return
    }
    
    // Find users in the first school
    const firstSchool = schools[0]
    console.log(`🔍 Searching for users in school: ${firstSchool.name} (${firstSchool.code})`)
    
    const users = await prisma.user.findMany({
      where: {
        schoolId: firstSchool.id,
        isActive: true,
        email: {
          not: null
        }
      },
      take: 5,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true
      }
    })
    
    console.log('👥 Found users:', users)
    
    if (users.length > 0) {
      console.log('✅ Test user found! You can use:')
      console.log(`   School Code: ${firstSchool.code}`)
      console.log(`   Email: ${users[0].email}`)
      console.log(`   Username: ${users[0].username}`)
    } else {
      console.log('❌ No active users with email found')
    }
    
  } catch (error) {
    console.error('❌ Error finding test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findTestUser()