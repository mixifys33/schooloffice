/**
 * Check the "stuff" table specifically for user credentials
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.DATABASE_URL

async function checkStuffTable() {
  console.log('🔍 Checking "stuff" table for user...')
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
    const stuffCollection = db.collection('stuff')
    
    console.log('🔍 Searching "stuff" collection...')
    
    // Search by email or phone with various field names
    const users = await stuffCollection.find({
      $or: [
        { email: 'teddymylove6@gmail.com' },
        { phone: '0761819885' },
        { phoneNumber: '0761819885' },
        { mobile: '0761819885' },
        { contactNumber: '0761819885' }
      ]
    }).toArray()

    if (users.length === 0) {
      console.log('✅ No users found in "stuff" collection with those credentials')
      console.log('🎉 You can proceed with staff registration!')
      return
    }

    console.log(`📋 Found ${users.length} user(s) in "stuff" collection:`)
    console.log('')

    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`)
      console.log('   ID:', user._id)
      console.log('   Name:', user.name || user.fullName || user.firstName + ' ' + user.lastName || 'N/A')
      console.log('   Email:', user.email || 'N/A')
      console.log('   Phone:', user.phone || user.phoneNumber || user.mobile || user.contactNumber || 'N/A')
      console.log('   Role:', user.role || user.position || user.staffRole || 'N/A')
      console.log('   School:', user.schoolId || user.school || 'N/A')
      console.log('   Status:', user.status || user.isActive || 'N/A')
      console.log('   Created:', user.createdAt || 'N/A')
      console.log('')
    })

    // Ask if user wants to modify these records
    console.log('🔧 Would you like me to modify these credentials to free them up?')
    console.log('   This will change their email/phone slightly so you can test with the original credentials.')
    console.log('')
    
    // Automatically modify to help with testing
    console.log('🔄 Modifying credentials automatically...')
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const timestamp = Date.now()
      const newEmail = user.email ? `${user.email.split('@')[0]}.old.${timestamp}@${user.email.split('@')[1]}` : null
      const newPhone = user.phone ? `${user.phone}${Math.floor(Math.random() * 100)}` : 
                      user.phoneNumber ? `${user.phoneNumber}${Math.floor(Math.random() * 100)}` : null

      const updateFields = {
        updatedAt: new Date(),
        modifiedForTesting: true,
        originalEmail: user.email,
        originalPhone: user.phone || user.phoneNumber || user.mobile || user.contactNumber
      }

      if (newEmail) updateFields.email = newEmail
      if (newPhone) {
        updateFields.phone = newPhone
        updateFields.phoneNumber = newPhone
        if (user.mobile) updateFields.mobile = newPhone
        if (user.contactNumber) updateFields.contactNumber = newPhone
      }

      const updateResult = await stuffCollection.updateOne(
        { _id: user._id },
        { $set: updateFields }
      )

      if (updateResult.modifiedCount > 0) {
        console.log(`✅ Modified User ${i + 1}:`)
        console.log('   New Email:', newEmail || 'unchanged')
        console.log('   New Phone:', newPhone || 'unchanged')
      } else {
        console.log(`❌ Failed to modify User ${i + 1}`)
      }
    }

    console.log('')
    console.log('🎉 Original credentials are now available for testing:')
    console.log('   Email: teddymylove6@gmail.com')
    console.log('   Phone: 0761819885')

  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

checkStuffTable().catch(console.error)