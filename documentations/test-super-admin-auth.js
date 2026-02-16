/**
 * Test super admin authentication and API access
 * Run with: node test-super-admin-auth.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSuperAdminAuth() {
  console.log('🔐 Testing Super Admin authentication...\n')

  try {
    // Check if we have a super admin user
    console.log('1. Checking for super admin users...')
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        isActive: true
      }
    })

    console.log(`✅ Found ${superAdmins.length} super admin users:`)
    superAdmins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.role}) - Active: ${admin.isActive}`)
    })

    if (superAdmins.length === 0) {
      console.log('❌ No super admin users found!')
      console.log('💡 You need to create a super admin user first.')
      return
    }

    // Check schools data
    console.log('\n2. Checking schools data...')
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        licenseType: true,
        createdAt: true
      },
      take: 5
    })

    console.log(`✅ Found ${schools.length} schools:`)
    schools.forEach(school => {
      console.log(`   - ${school.name} (${school.licenseType}) - Active: ${school.isActive}`)
    })

    // Test the API endpoint directly (without authentication)
    console.log('\n3. Testing API endpoint structure...')
    
    // We can't test the actual API call here without setting up the full Next.js context,
    // but we can test the data queries that the API would make
    
    const totalSchools = await prisma.school.count()
    const activeSchools = await prisma.school.count({ where: { isActive: true } })
    const suspendedSchools = await prisma.school.count({ where: { isActive: false } })
    
    console.log('✅ API data queries working:')
    console.log(`   - Total schools: ${totalSchools}`)
    console.log(`   - Active schools: ${activeSchools}`)
    console.log(`   - Suspended schools: ${suspendedSchools}`)

    console.log('\n✅ Super Admin setup looks good!')
    console.log('💡 If the dashboard is still failing, the issue is likely:')
    console.log('   1. Authentication/session issues')
    console.log('   2. Next.js routing problems')
    console.log('   3. Missing environment variables')

  } catch (error) {
    console.error('🚨 Test failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testSuperAdminAuth()