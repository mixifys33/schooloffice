/**
 * Check and modify user credentials for testing
 * Finds user with specific email/phone and modifies them slightly
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.DATABASE_URL

async function checkAndModifyUser() {
  console.log('🔍 Checking database for user...')
  console.log('Email:', 'teddymylove6@gmail.com')
  console.log('Phone:', '0761819885')
  console.log('')

  if (!MONGODB_URI) {
    console.error('❌ DATABASE_URL not found in .env file')
    return
  }

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db()
    
    // Check multiple collections where user might exist
    const collections = ['users', 'staff', 'teachers', 'admins']
    let foundUser = null
    let foundCollection = null

    for (const collectionName of collections) {
      console.log(`\n🔍 Checking ${collectionName} collection...`)
      
      const collection = db.collection(collectionName)
      
      // Search by email or phone
      const user = await collection.findOne({
        $or: [
          { email: 'teddymylove6@gmail.com' },
          { phone: '0761819885' },
          { phoneNumber: '0761819885' }
        ]
      })

      if (user) {
        foundUser = user
        foundCollection = collectionName
        console.log(`✅ Found user in ${collectionName}:`)
        console.log('   ID:', user._id)
        console.log('   Name:', user.name || user.fullName || 'N/A')
        console.log('   Email:', user.email || 'N/A')
        console.log('   Phone:', user.phone || user.phoneNumber || 'N/A')
        console.log('   Role:', user.role || user.userType || 'N/A')
        console.log('   Created:', user.createdAt || 'N/A')
        break
      } else {
        console.log(`   No user found in ${collectionName}`)
      }
    }

    if (!foundUser) {
      console.log('\n🎉 Good news! No user found with those credentials.')
      console.log('   You can proceed with staff registration using:')
      console.log('   Email: teddymylove6@gmail.com')
      console.log('   Phone: 0761819885')
      return
    }

    // User found, let's modify their credentials
    console.log('\n🔧 User found! Modifying credentials to free them up...')
    
    const collection = db.collection(foundCollection)
    const newEmail = `teddymylove6.old.${Date.now()}@gmail.com`
    const newPhone = `0761819885${Math.floor(Math.random() * 100)}`

    const updateResult = await collection.updateOne(
      { _id: foundUser._id },
      {
        $set: {
          email: newEmail,
          phone: newPhone,
          phoneNumber: newPhone, // Update both possible phone fields
          updatedAt: new Date(),
          modifiedForTesting: true,
          originalEmail: 'teddymylove6@gmail.com',
          originalPhone: '0761819885'
        }
      }
    )

    if (updateResult.modifiedCount > 0) {
      console.log('✅ User credentials successfully modified!')
      console.log('   New Email:', newEmail)
      console.log('   New Phone:', newPhone)
      console.log('')
      console.log('🎉 You can now use the original credentials for staff registration:')
      console.log('   Email: teddymylove6@gmail.com')
      console.log('   Phone: 0761819885')
      console.log('')
      console.log('💡 Note: The original user is preserved with modified credentials')
      console.log('   and marked with "modifiedForTesting: true" for easy identification')
    } else {
      console.log('❌ Failed to modify user credentials')
    }

  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

checkAndModifyUser().catch(console.error)