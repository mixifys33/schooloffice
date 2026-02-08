/**
 * Debug Login Credentials
 * This script tests the authentication logic to identify why login is failing
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function debugLoginCredentials() {
  try {
    console.log('🔍 Debugging login credentials...')
    console.log('='.repeat(60))
    
    // Test credentials - replace with the ones you're trying to use
    const testCredentials = {
      schoolCode: 'VALLEY',
      identifier: 'mixifys33@gmail.com', // or whatever email you're using
      password: 'TestPassword123!' // or whatever password you're using
    }
    
    console.log('📋 Testing with credentials:')
    console.log('- School Code:', testCredentials.schoolCode)
    console.log('- Identifier:', testCredentials.identifier)
    console.log('- Password:', '[HIDDEN]')
    console.log('')
    
    // Step 1: Check school
    console.log('🔄 Step 1: Checking school...')
    const normalizedSchoolCode = testCredentials.schoolCode.trim().toUpperCase()
    
    const school = await prisma.school.findUnique({
      where: { code: normalizedSchoolCode },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        licenseType: true,
      },
    })
    
    if (!school) {
      console.log('❌ School not found with code:', normalizedSchoolCode)
      return
    }
    
    console.log('✅ School found:', school.name)
    console.log('- ID:', school.id)
    console.log('- Code:', school.code)
    console.log('- Active:', school.isActive)
    console.log('- License:', school.licenseType)
    console.log('')
    
    if (!school.isActive) {
      console.log('❌ School is suspended!')
      return
    }
    
    // Step 2: Check user
    console.log('🔄 Step 2: Checking user...')
    const identifier = testCredentials.identifier.trim().toLowerCase()
    
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: testCredentials.identifier },
        ],
      },
      include: {
        staff: {
          select: {
            primaryRole: true,
            secondaryRoles: true,
          },
        },
      },
    })
    
    if (!user) {
      console.log('❌ User not found with identifier:', testCredentials.identifier)
      console.log('')
      console.log('🔍 Let me check what users exist in this school...')
      
      const allUsers = await prisma.user.findMany({
        where: { schoolId: school.id },
        select: {
          email: true,
          phone: true,
          username: true,
          isActive: true,
          role: true
        }
      })
      
      console.log('Users in school:')
      allUsers.forEach((u, index) => {
        console.log(`${index + 1}. Email: ${u.email}`)
        console.log(`   Phone: ${u.phone || 'N/A'}`)
        console.log(`   Username: ${u.username || 'N/A'}`)
        console.log(`   Active: ${u.isActive}`)
        console.log(`   Role: ${u.role}`)
        console.log('')
      })
      return
    }
    
    console.log('✅ User found:', user.email)
    console.log('- ID:', user.id)
    console.log('- Email:', user.email)
    console.log('- Phone:', user.phone || 'N/A')
    console.log('- Username:', user.username || 'N/A')
    console.log('- Role:', user.role)
    console.log('- Active:', user.isActive)
    console.log('- Force Reset:', user.forcePasswordReset)
    console.log('- Has Password:', !!user.passwordHash)
    console.log('- Failed Attempts:', user.failedAttempts)
    console.log('- Locked Until:', user.lockedUntil || 'Not locked')
    console.log('')
    
    if (!user.isActive) {
      console.log('❌ User is inactive!')
      return
    }
    
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log('❌ User account is locked until:', user.lockedUntil)
      return
    }
    
    if (!user.passwordHash) {
      console.log('❌ User has no password set!')
      return
    }
    
    // Step 3: Check password
    console.log('🔄 Step 3: Checking password...')
    const isValidPassword = await bcrypt.compare(testCredentials.password, user.passwordHash)
    
    if (!isValidPassword) {
      console.log('❌ Password does not match!')
      console.log('')
      console.log('🔍 Password debugging:')
      console.log('- Provided password length:', testCredentials.password.length)
      console.log('- Hash exists:', !!user.passwordHash)
      console.log('- Hash length:', user.passwordHash?.length || 0)
      return
    }
    
    console.log('✅ Password matches!')
    console.log('')
    
    // Step 4: Check roles
    console.log('🔄 Step 4: Checking roles...')
    const userRoles = user.roles && user.roles.length > 0
      ? user.roles
      : [user.role]
    
    const allRoles = [...userRoles]
    if (user.staff) {
      if (user.staff.primaryRole) {
        allRoles.push(user.staff.primaryRole)
      }
      if (user.staff.secondaryRoles && user.staff.secondaryRoles.length > 0) {
        allRoles.push(...user.staff.secondaryRoles)
      }
    }
    
    const activeRole = user.staff?.primaryRole || user.activeRole || userRoles[0]
    
    console.log('✅ Roles configured:')
    console.log('- User roles:', userRoles)
    console.log('- All roles:', allRoles)
    console.log('- Active role:', activeRole)
    console.log('- Has staff profile:', !!user.staff)
    if (user.staff) {
      console.log('- Staff primary role:', user.staff.primaryRole)
      console.log('- Staff secondary roles:', user.staff.secondaryRoles)
    }
    console.log('')
    
    console.log('🎉 Authentication should succeed!')
    console.log('')
    console.log('📊 Expected login result:')
    console.log('- User ID:', user.id)
    console.log('- Email:', user.email)
    console.log('- Active Role:', activeRole)
    console.log('- School:', school.name)
    console.log('- Force Password Reset:', user.forcePasswordReset)
    
    if (user.forcePasswordReset) {
      console.log('')
      console.log('⚠️  User will be prompted to reset password after login')
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugLoginCredentials()