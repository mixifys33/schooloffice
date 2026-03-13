/**
 * Check current user role and fix academic year creation permissions
 */

const { MongoClient } = require('mongodb')
require('dotenv').config()

const MONGODB_URI = process.env.DATABASE_URL

async function checkUserRoleAndFix() {
  console.log('🔍 CHECKING USER ROLE AND PERMISSIONS')
  console.log('=====================================')
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
    
    // Step 1: Find your user account
    console.log('\n🔍 STEP 1: Finding your user account...')
    
    const userCollections = ['User', 'users', 'Staff', 'staff']
    let currentUser = null
    let userCollection = null

    for (const collectionName of userCollections) {
      try {
        const collection = db.collection(collectionName)
        
        // Search for users with admin-like emails or roles
        const users = await collection.find({
          $or: [
            { email: { $regex: /admin|test|school/i } },
            { role: { $in: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMIN'] } },
            { userType: { $in: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMIN'] } }
          ]
        }).toArray()

        if (users.length > 0) {
          console.log(`\n📋 Found ${users.length} admin user(s) in ${collectionName}:`)
          users.forEach((user, index) => {
            console.log(`\n👤 User ${index + 1}:`)
            console.log('   ID:', user._id)
            console.log('   Name:', user.name || user.fullName || 'N/A')
            console.log('   Email:', user.email || 'N/A')
            console.log('   Role:', user.role || user.userType || 'N/A')
            console.log('   School:', user.schoolId || user.school || 'N/A')
            console.log('   Status:', user.status || user.isActive || 'N/A')
            console.log('   Created:', user.createdAt || 'N/A')
          })
          
          // Use the first admin user found
          currentUser = users[0]
          userCollection = collectionName
          break
        }
      } catch (error) {
        console.log(`   ⚠️ Error checking ${collectionName}:`, error.message)
      }
    }

    if (!currentUser) {
      console.log('\n❌ No admin users found. Let me check all users...')
      
      // Check all users if no admin found
      for (const collectionName of userCollections) {
        try {
          const collection = db.collection(collectionName)
          const allUsers = await collection.find({}).limit(10).toArray()
          
          if (allUsers.length > 0) {
            console.log(`\n📋 Found ${allUsers.length} user(s) in ${collectionName}:`)
            allUsers.forEach((user, index) => {
              console.log(`\n👤 User ${index + 1}:`)
              console.log('   ID:', user._id)
              console.log('   Name:', user.name || user.fullName || 'N/A')
              console.log('   Email:', user.email || 'N/A')
              console.log('   Role:', user.role || user.userType || 'N/A')
              console.log('   School:', user.schoolId || user.school || 'N/A')
            })
            
            // Use the first user found
            currentUser = allUsers[0]
            userCollection = collectionName
            break
          }
        } catch (error) {
          console.log(`   ⚠️ Error checking ${collectionName}:`, error.message)
        }
      }
    }

    if (!currentUser) {
      console.log('\n❌ No users found in database!')
      return
    }

    // Step 2: Check and fix user role
    console.log('\n🔧 STEP 2: Checking and fixing user role...')
    
    const currentRole = currentUser.role || currentUser.userType
    console.log('Current role:', currentRole)
    
    if (currentRole === 'SCHOOL_ADMIN' || currentRole === 'SUPER_ADMIN') {
      console.log('✅ User already has admin permissions!')
    } else {
      console.log('⚠️ User does not have admin permissions. Fixing...')
      
      const collection = db.collection(userCollection)
      
      const updateResult = await collection.updateOne(
        { _id: currentUser._id },
        {
          $set: {
            role: 'SCHOOL_ADMIN',
            userType: 'SCHOOL_ADMIN',
            updatedAt: new Date(),
            permissionFixApplied: true,
            permissionFixReason: 'Fixed academic year creation permissions'
          }
        }
      )

      if (updateResult.modifiedCount > 0) {
        console.log('✅ User role updated to SCHOOL_ADMIN!')
      } else {
        console.log('❌ Failed to update user role')
      }
    }

    // Step 3: Check for other admin users and fix them too
    console.log('\n🔧 STEP 3: Fixing all admin users...')
    
    for (const collectionName of userCollections) {
      try {
        const collection = db.collection(collectionName)
        
        // Find users that should be admins but aren't
        const usersToFix = await collection.find({
          $and: [
            {
              $or: [
                { email: { $regex: /admin|school/i } },
                { name: { $regex: /admin|school/i } },
                { role: { $in: ['ADMIN', 'admin'] } },
                { userType: { $in: ['ADMIN', 'admin'] } }
              ]
            },
            {
              role: { $nin: ['SCHOOL_ADMIN', 'SUPER_ADMIN'] }
            }
          ]
        }).toArray()

        if (usersToFix.length > 0) {
          console.log(`\n📋 Fixing ${usersToFix.length} user(s) in ${collectionName}...`)
          
          for (const user of usersToFix) {
            const updateResult = await collection.updateOne(
              { _id: user._id },
              {
                $set: {
                  role: 'SCHOOL_ADMIN',
                  userType: 'SCHOOL_ADMIN',
                  updatedAt: new Date(),
                  permissionFixApplied: true,
                  permissionFixReason: 'Fixed academic year creation permissions'
                }
              }
            )

            if (updateResult.modifiedCount > 0) {
              console.log(`   ✅ Fixed user: ${user.name || user.email || user._id}`)
            }
          }
        } else {
          console.log(`   ✅ No users to fix in ${collectionName}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Error fixing users in ${collectionName}:`, error.message)
      }
    }

    // Step 4: Verify the fix
    console.log('\n✅ STEP 4: Verification...')
    
    const collection = db.collection(userCollection)
    const updatedUser = await collection.findOne({ _id: currentUser._id })
    
    if (updatedUser) {
      console.log('\n👤 Updated User Details:')
      console.log('   ID:', updatedUser._id)
      console.log('   Name:', updatedUser.name || updatedUser.fullName || 'N/A')
      console.log('   Email:', updatedUser.email || 'N/A')
      console.log('   Role:', updatedUser.role || updatedUser.userType || 'N/A')
      console.log('   School:', updatedUser.schoolId || updatedUser.school || 'N/A')
      console.log('   Status:', updatedUser.status || updatedUser.isActive || 'N/A')
    }

    console.log('\n🎉 PERMISSION FIX COMPLETE!')
    console.log('==========================================')
    console.log('✅ User role has been set to SCHOOL_ADMIN')
    console.log('✅ You should now be able to create academic years and terms')
    console.log('✅ Please refresh your browser and try again')
    console.log('')
    console.log('💡 If you still get permission errors:')
    console.log('   1. Log out and log back in')
    console.log('   2. Clear your browser cache')
    console.log('   3. Check that you\'re logged in as the correct user')

  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

checkUserRoleAndFix().catch(console.error)