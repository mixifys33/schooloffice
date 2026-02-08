/**
 * Create Test User for Forgot Password Testing
 * This script creates a test user with the email you were testing
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    console.log('🔧 Creating test user for forgot password testing...')
    
    // Find the VALLEY school
    const school = await prisma.school.findUnique({
      where: { code: 'VALLEY' },
      select: { id: true, name: true }
    })
    
    if (!school) {
      console.error('❌ VALLEY school not found!')
      return
    }
    
    console.log('✅ Found school:', school.name)
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: 'mixifys33@gmail.com',
        schoolId: school.id
      }
    })
    
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email)
      console.log('- ID:', existingUser.id)
      console.log('- Phone:', existingUser.phone || 'N/A')
      console.log('- Role:', existingUser.role)
      console.log('- Active:', existingUser.isActive)
      return
    }
    
    // Create the test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12)
    
    const newUser = await prisma.user.create({
      data: {
        email: 'mixifys33@gmail.com',
        phone: '+256700123456', // Test phone number
        username: 'testuser.mixifys33', // Add unique username
        passwordHash: hashedPassword, // Correct field name
        role: 'TEACHER',
        isActive: true,
        schoolId: school.id,
      }
    })
    
    console.log('✅ Test user created successfully!')
    console.log('- Email:', newUser.email)
    console.log('- Phone:', newUser.phone)
    console.log('- ID:', newUser.id)
    console.log('- Role:', newUser.role)
    console.log('- School:', school.name)
    console.log('')
    console.log('🧪 You can now test forgot password with:')
    console.log('- School Code: VALLEY')
    console.log('- Email: mixifys33@gmail.com')
    console.log('- Phone: +256700123456')
    
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()