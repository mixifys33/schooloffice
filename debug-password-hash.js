require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function debugPasswordHash() {
  try {
    console.log('🔍 Looking up user kimfa9717@gmail.com...')
    
    // First, let's check if the user exists at all
    const allUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'kimfa9717',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        isActive: true,
        school: {
          select: {
            code: true,
            name: true
          }
        }
      }
    })

    console.log('Found users matching kimfa9717:', allUsers.length)
    allUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        schoolCode: user.school?.code,
        schoolName: user.school?.name,
        hasPasswordHash: !!user.passwordHash,
        hashLength: user.passwordHash?.length,
        hashPrefix: user.passwordHash?.substring(0, 20)
      })
    })

    if (allUsers.length === 0) {
      console.log('❌ No users found with kimfa9717 in email')
      return
    }

    const user = allUsers[0]

    // Test the password verification
    const testPassword = 'TempPass123!'
    console.log('\n🔧 Testing password verification...')
    console.log('Password to test:', testPassword)
    console.log('Hash to compare against:', user.passwordHash)

    if (user.passwordHash) {
      try {
        const isValid = await bcrypt.compare(testPassword, user.passwordHash)
        console.log('✅ Password verification result:', isValid)

        // Let's also try creating a new hash with the same password to compare
        console.log('\n🔧 Creating new hash for comparison...')
        const newHash = await bcrypt.hash(testPassword, 12)
        console.log('New hash:', newHash)
        
        const newHashValid = await bcrypt.compare(testPassword, newHash)
        console.log('New hash verification:', newHashValid)

        // Check if the stored hash is valid bcrypt format
        const hashPattern = /^\$2[aby]?\$\d+\$/
        const isValidBcryptFormat = hashPattern.test(user.passwordHash)
        console.log('Is valid bcrypt format:', isValidBcryptFormat)

        // Try some common passwords
        const commonPasswords = ['password', 'Password123', 'TempPass123', 'temppass123!', 'TempPass123!']
        console.log('\n🔧 Testing common passwords...')
        for (const pwd of commonPasswords) {
          const result = await bcrypt.compare(pwd, user.passwordHash)
          console.log(`Password "${pwd}": ${result}`)
        }

      } catch (bcryptError) {
        console.error('❌ Bcrypt error:', bcryptError)
      }
    } else {
      console.log('❌ No password hash found for user')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

debugPasswordHash()