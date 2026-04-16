/**
 * Restore the "stuff" table records that were modified for testing
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.DATABASE_URL

async function restoreStuffTable() {
  console.log('🔄 Restoring modified records in "stuff" table...')
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
    
    console.log('🔍 Searching for modified records...')
    
    // Find all records that were modified for testing
    const modifiedUsers = await stuffCollection.find({
      modifiedForTesting: true
    }).toArray()

    if (modifiedUsers.length === 0) {
      console.log('✅ No modified records found in "stuff" collection')
      console.log('🎉 Nothing to restore!')
      return
    }

    console.log(`📋 Found ${modifiedUsers.length} modified record(s):`)
    console.log('')

    modifiedUsers.forEach((user, index) => {
      console.log(`👤 Record ${index + 1}:`)
      console.log('   ID:', user._id)
      console.log('   Current Email:', user.email || 'N/A')
      console.log('   Original Email:', user.originalEmail || 'N/A')
      console.log('   Current Phone:', user.phone || user.phoneNumber || 'N/A')
      console.log('   Original Phone:', user.originalPhone || 'N/A')
      console.log('')
    })

    console.log('🔄 Restoring original credentials...')
    console.log('')
    
    for (let i = 0; i < modifiedUsers.length; i++) {
      const user = modifiedUsers[i]

      const restoreFields = {
        updatedAt: new Date()
      }

      // Restore original email
      if (user.originalEmail) {
        restoreFields.email = user.originalEmail
      }

      // Restore original phone to all phone fields that exist
      if (user.originalPhone) {
        if (user.phone !== undefined) restoreFields.phone = user.originalPhone
        if (user.phoneNumber !== undefined) restoreFields.phoneNumber = user.originalPhone
        if (user.mobile !== undefined) restoreFields.mobile = user.originalPhone
        if (user.contactNumber !== undefined) restoreFields.contactNumber = user.originalPhone
      }

      // Remove the testing flags and backup fields
      const unsetFields = {
        modifiedForTesting: "",
        originalEmail: "",
        originalPhone: ""
      }

      const updateResult = await stuffCollection.updateOne(
        { _id: user._id },
        { 
          $set: restoreFields,
          $unset: unsetFields
        }
      )

      if (updateResult.modifiedCount > 0) {
        console.log(`✅ Restored Record ${i + 1}:`)
        console.log('   Email:', user.originalEmail || 'unchanged')
        console.log('   Phone:', user.originalPhone || 'unchanged')
      } else {
        console.log(`❌ Failed to restore Record ${i + 1}`)
      }
    }

    console.log('')
    console.log('🎉 All records have been restored to their original state!')
  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

restoreStuffTable().catch(console.error)
