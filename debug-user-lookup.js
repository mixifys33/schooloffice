const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugUserLookup() {
  try {
    console.log('🔍 [DEBUG] Starting user lookup debug...')
    
    const schoolCode = 'VALLEY'
    const identifier = 'mixify055@gmail.com'
    
    // Find school first
    console.log(`🔍 [DEBUG] Looking for school with code: ${schoolCode}`)
    const school = await prisma.school.findUnique({
      where: { code: schoolCode.trim().toUpperCase() },
      select: { id: true, name: true, code: true }
    })
    
    if (!school) {
      console.log('❌ [DEBUG] School not found!')
      return
    }
    
    console.log(`✅ [DEBUG] School found:`, school)
    
    // Look for users with this email in this school
    console.log(`🔍 [DEBUG] Looking for users with identifier: ${identifier}`)
    console.log(`🔍 [DEBUG] In school ID: ${school.id}`)
    
    const users = await prisma.user.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
          { username: identifier.toLowerCase() },
        ]
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        isActive: true,
        role: true,
        createdAt: true,
        staffProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    console.log(`🔍 [DEBUG] Found ${users.length} users matching identifier`)
    
    if (users.length === 0) {
      console.log('❌ [DEBUG] No users found with that identifier')
      
      // Let's search for any users with similar email
      console.log(`🔍 [DEBUG] Searching for users with similar email patterns...`)
      const similarUsers = await prisma.user.findMany({
        where: {
          schoolId: school.id,
          email: {
            contains: 'mixify'
          }
        },
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          isActive: true,
          role: true,
          staffProfile: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })
      
      console.log(`🔍 [DEBUG] Found ${similarUsers.length} users with similar email patterns:`)
      similarUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role}, active: ${user.isActive})`)
      })
      
      // Let's also check all users in this school
      console.log(`🔍 [DEBUG] Checking all users in school ${schoolCode}...`)
      const allUsers = await prisma.user.findMany({
        where: {
          schoolId: school.id
        },
        select: {
          id: true,
          email: true,
          phone: true,
          username: true,
          isActive: true,
          role: true,
          staffProfile: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        take: 10 // Limit to first 10 for debugging
      })
      
      console.log(`🔍 [DEBUG] First 10 users in school:`)
      allUsers.forEach(user => {
        console.log(`  - ${user.email || 'NO EMAIL'} | ${user.username || 'NO USERNAME'} | ${user.phone || 'NO PHONE'} (${user.role}, active: ${user.isActive})`)
      })
      
    } else {
      users.forEach((user, index) => {
        console.log(`✅ [DEBUG] User ${index + 1}:`)
        console.log(`  - ID: ${user.id}`)
        console.log(`  - Email: ${user.email || 'N/A'}`)
        console.log(`  - Phone: ${user.phone || 'N/A'}`)
        console.log(`  - Username: ${user.username || 'N/A'}`)
        console.log(`  - Role: ${user.role}`)
        console.log(`  - Active: ${user.isActive}`)
        console.log(`  - Created: ${user.createdAt}`)
        if (user.staffProfile) {
          console.log(`  - Staff: ${user.staffProfile.firstName} ${user.staffProfile.lastName}`)
        }
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error during lookup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUserLookup()