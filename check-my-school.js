const { MongoClient } = require('mongodb')

const DATABASE_URL = "mongodb+srv://schooloffice_acedmy:jl7doyh6aoABCK9j@schooloffice.jshbhxm.mongodb.net/schooloffice?retryWrites=true&w=majority"

async function main() {
  const client = new MongoClient(DATABASE_URL)
  await client.connect()
  const db = client.db('schooloffice')

  const phone = '0761819885'

  // Search across common collections for this phone number
  const collections = ['User', 'School', 'Staff', 'Admin', 'SuperAdmin']

  console.log(`\n🔍 Searching for phone: ${phone}\n`)

  for (const col of collections) {
    try {
      const results = await db.collection(col).find({
        $or: [
          { phone: { $regex: phone } },
          { phoneNumber: { $regex: phone } },
          { contactPhone: { $regex: phone } },
        ]
      }).toArray()

      if (results.length > 0) {
        console.log(`✅ Found in [${col}]:`)
        results.forEach(r => console.log(JSON.stringify(r, null, 2)))
      }
    } catch (e) {
      // collection might not exist, skip
    }
  }

  // Also list all schools regardless
  console.log('\n📚 All Schools in DB:\n')
  const schools = await db.collection('School').find({}).toArray()
  if (schools.length === 0) {
    console.log('No schools found.')
  } else {
    schools.forEach(s => {
      console.log(`- ID: ${s._id}`)
      console.log(`  Name: ${s.name}`)
      console.log(`  Phone: ${s.phone || s.phoneNumber || 'N/A'}`)
      console.log(`  Email: ${s.email || 'N/A'}`)
      console.log(`  Created: ${s.createdAt || 'N/A'}`)
      console.log()
    })
  }

  await client.close()
}

main().catch(console.error)
