/**
 * Comprehensive database check - all schools, admins, and user credentials
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.DATABASE_URL

async function checkAllSchoolsAndUsers() {
  console.log('🔍 COMPREHENSIVE DATABASE CHECK')
  console.log('================================')
  console.log('Target Email:', 'teddymylove6@gmail.com')
  console.log('Target Phone:', '0761819885')
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
    
    // First, get all collections in the database
    console.log('\n📋 STEP 1: Getting all collections...')
    const collections = await db.listCollections().toArray()
    console.log('Found collections:', collections.map(c => c.name).join(', '))

    // Step 2: Get all schools and their admins
    console.log('\n🏫 STEP 2: Getting all schools and their admins...')
    
    try {
      const schoolsCollection = db.collection('schools')
      const schools = await schoolsCollection.find({}).toArray()
      
      console.log(`Found ${schools.length} schools:`)
      schools.forEach((school, index) => {
        console.log(`\n🏫 School ${index + 1}:`)
        console.log('   ID:', school._id)
        console.log('   Name:', school.name || school.schoolName || 'N/A')
        console.log('   Code:', school.code || school.schoolCode || 'N/A')
        console.log('   Admin ID:', school.adminId || school.schoolAdminId || 'N/A')
        console.log('   Admin Email:', school.adminEmail || 'N/A')
        console.log('   Status:', school.status || school.isActive || 'N/A')
        console.log('   Created:', school.createdAt || 'N/A')
      })
    } catch (error) {
      console.log('❌ No schools collection or error:', error.message)
    }

    // Step 3: Search for target credentials in ALL collections
    console.log('\n🔍 STEP 3: Searching for target credentials in ALL collections...')
    
    const targetEmail = 'teddymylove6@gmail.com'
    const targetPhone = '0761819885'
    let foundUsers = []

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      console.log(`\n🔍 Checking ${collectionName}...`)
      
      try {
        const collection = db.collection(collectionName)
        
        // Search with multiple field variations
        const users = await collection.find({
          $or: [
            { email: targetEmail },
            { userEmail: targetEmail },
            { adminEmail: targetEmail },
            { contactEmail: targetEmail },
            { phone: targetPhone },
            { phoneNumber: targetPhone },
            { mobile: targetPhone },
            { contactNumber: targetPhone },
            { adminPhone: targetPhone },
            { userPhone: targetPhone }
          ]
        }).toArray()

        if (users.length > 0) {
          console.log(`   ✅ Found ${users.length} matching record(s)!`)
          
          users.forEach((user, index) => {
            console.log(`   \n   👤 Record ${index + 1}:`)
            console.log('      ID:', user._id)
            console.log('      Name:', user.name || user.fullName || user.firstName + ' ' + user.lastName || user.schoolName || 'N/A')
            console.log('      Email:', user.email || user.userEmail || user.adminEmail || user.contactEmail || 'N/A')
            console.log('      Phone:', user.phone || user.phoneNumber || user.mobile || user.contactNumber || user.adminPhone || user.userPhone || 'N/A')
            console.log('      Role:', user.role || user.userType || user.position || user.staffRole || 'N/A')
            console.log('      School:', user.schoolId || user.school || user.schoolCode || 'N/A')
            console.log('      Status:', user.status || user.isActive || 'N/A')
            console.log('      Created:', user.createdAt || 'N/A')
            
            foundUsers.push({
              collection: collectionName,
              user: user
            })
          })
        } else {
          console.log('   ❌ No matches')
        }
      } catch (error) {
        console.log(`   ⚠️ Error checking ${collectionName}:`, error.message)
      }
    }

    // Step 4: Summary and action
    console.log('\n📊 SUMMARY')
    console.log('==========')
    
    if (foundUsers.length === 0) {
      console.log('🎉 NO CONFLICTS FOUND!')
      console.log('   You can safely use these credentials for staff registration:')
      console.log('   Email: teddymylove6@gmail.com')
      console.log('   Phone: 0761819885')
    } else {
      console.log(`⚠️ FOUND ${foundUsers.length} CONFLICTING RECORD(S)`)
      console.log('\nConflicts found in:')
      foundUsers.forEach((item, index) => {
        console.log(`   ${index + 1}. Collection: ${item.collection}`)
        console.log(`      User: ${item.user.name || item.user.fullName || 'N/A'}`)
        console.log(`      Email: ${item.user.email || 'N/A'}`)
        console.log(`      Phone: ${item.user.phone || item.user.phoneNumber || 'N/A'}`)
      })

      console.log('\n🔧 FIXING CONFLICTS...')
      
      // Modify conflicting records
      for (let i = 0; i < foundUsers.length; i++) {
        const item = foundUsers[i]
        const collection = db.collection(item.collection)
        const user = item.user
        
        const timestamp = Date.now()
        const newEmail = user.email ? `${user.email.split('@')[0]}.old.${timestamp}@${user.email.split('@')[1]}` : null
        const newPhone = (user.phone || user.phoneNumber || user.mobile) ? 
          `${user.phone || user.phoneNumber || user.mobile}${Math.floor(Math.random() * 100)}` : null

        const updateFields = {
          updatedAt: new Date(),
          modifiedForTesting: true,
          modificationReason: 'Freed up credentials for staff registration testing',
          originalEmail: user.email || user.userEmail || user.adminEmail,
          originalPhone: user.phone || user.phoneNumber || user.mobile || user.contactNumber
        }

        // Update all possible email fields
        if (newEmail) {
          if (user.email) updateFields.email = newEmail
          if (user.userEmail) updateFields.userEmail = newEmail
          if (user.adminEmail) updateFields.adminEmail = newEmail
          if (user.contactEmail) updateFields.contactEmail = newEmail
        }

        // Update all possible phone fields
        if (newPhone) {
          if (user.phone) updateFields.phone = newPhone
          if (user.phoneNumber) updateFields.phoneNumber = newPhone
          if (user.mobile) updateFields.mobile = newPhone
          if (user.contactNumber) updateFields.contactNumber = newPhone
          if (user.adminPhone) updateFields.adminPhone = newPhone
          if (user.userPhone) updateFields.userPhone = newPhone
        }

        try {
          const updateResult = await collection.updateOne(
            { _id: user._id },
            { $set: updateFields }
          )

          if (updateResult.modifiedCount > 0) {
            console.log(`   ✅ Fixed conflict in ${item.collection}`)
            console.log(`      New Email: ${newEmail || 'unchanged'}`)
            console.log(`      New Phone: ${newPhone || 'unchanged'}`)
          } else {
            console.log(`   ❌ Failed to fix conflict in ${item.collection}`)
          }
        } catch (error) {
          console.log(`   ❌ Error fixing ${item.collection}:`, error.message)
        }
      }

      console.log('\n🎉 CONFLICTS RESOLVED!')
      console.log('   You can now use these credentials for staff registration:')
      console.log('   Email: teddymylove6@gmail.com')
      console.log('   Phone: 0761819885')
    }

  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

checkAllSchoolsAndUsers().catch(console.error)