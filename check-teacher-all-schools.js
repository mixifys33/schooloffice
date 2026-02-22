const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacherAllSchools() {
  try {
    const email = 'dwightkim12@gmail.com'
    const phone = '0761000880'
    const teacherId = '69926eac35ac00f3b00e10d7'
    
    console.log(`\n🔍 Searching across ALL schools for:`)
    console.log(`   Email: ${email}`)
    console.log(`   Phone: ${phone}`)
    console.log(`   Teacher ID: ${teacherId}\n`)
    
    // Search by ID across all schools
    console.log('📋 Searching by Teacher ID...')
    const staffById = await prisma.staff.findUnique({
      where: { id: teacherId },
      include: {
        school: { select: { id: true, name: true, code: true } },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            isActive: true,
          }
        }
      }
    })
    
    if (staffById) {
      console.log('✅ FOUND by ID!')
      console.log(`   School: ${staffById.school.name} (${staffById.school.code})`)
      console.log(`   Name: ${staffById.firstName} ${staffById.lastName}`)
      console.log(`   Email: ${staffById.email}`)
      console.log(`   Phone: ${staffById.phone}`)
      console.log(`   Status: ${staffById.status}`)
      console.log(`   User ID: ${staffById.userId}`)
      if (staffById.user) {
        console.log(`   User Active: ${staffById.user.isActive}`)
        console.log(`   User Email: ${staffById.user.email}`)
        console.log(`   User Phone: ${staffById.user.phone}`)
      } else {
        console.log('   ❌ NO USER LINKED!')
      }
    } else {
      console.log('❌ NOT FOUND by ID')
    }
    
    // Search by email across all schools
    console.log('\n📋 Searching by Email across all schools...')
    const staffByEmail = await prisma.staff.findMany({
      where: {
        OR: [
          { email: email },
          { email: email.toLowerCase() },
        ]
      },
      include: {
        school: { select: { id: true, name: true, code: true } },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            isActive: true,
          }
        }
      }
    })
    
    if (staffByEmail.length > 0) {
      console.log(`✅ FOUND ${staffByEmail.length} staff member(s) with this email:`)
      staffByEmail.forEach((s, i) => {
        console.log(`\n${i + 1}. ${s.firstName} ${s.lastName}`)
        console.log(`   School: ${s.school.name} (${s.school.code})`)
        console.log(`   Email: ${s.email}`)
        console.log(`   Phone: ${s.phone}`)
        console.log(`   Status: ${s.status}`)
        console.log(`   Staff ID: ${s.id}`)
        console.log(`   User ID: ${s.userId}`)
        if (s.user) {
          console.log(`   User Active: ${s.user.isActive}`)
          console.log(`   User Email: ${s.user.email}`)
        } else {
          console.log('   ❌ NO USER LINKED!')
        }
      })
    } else {
      console.log('❌ NOT FOUND by email')
    }
    
    // Search by phone across all schools
    console.log('\n📋 Searching by Phone across all schools...')
    const staffByPhone = await prisma.staff.findMany({
      where: { phone: phone },
      include: {
        school: { select: { id: true, name: true, code: true } },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            isActive: true,
          }
        }
      }
    })
    
    if (staffByPhone.length > 0) {
      console.log(`✅ FOUND ${staffByPhone.length} staff member(s) with this phone:`)
      staffByPhone.forEach((s, i) => {
        console.log(`\n${i + 1}. ${s.firstName} ${s.lastName}`)
        console.log(`   School: ${s.school.name} (${s.school.code})`)
        console.log(`   Email: ${s.email}`)
        console.log(`   Phone: ${s.phone}`)
        console.log(`   Status: ${s.status}`)
        console.log(`   Staff ID: ${s.id}`)
        console.log(`   User ID: ${s.userId}`)
        if (s.user) {
          console.log(`   User Active: ${s.user.isActive}`)
          console.log(`   User Email: ${s.user.email}`)
        } else {
          console.log('   ❌ NO USER LINKED!')
        }
      })
    } else {
      console.log('❌ NOT FOUND by phone')
    }
    
    // Search User table
    console.log('\n📋 Searching User table by email...')
    const userByEmail = await prisma.user.findMany({
      where: {
        OR: [
          { email: email },
          { email: email.toLowerCase() },
        ]
      },
      include: {
        school: { select: { id: true, name: true, code: true } }
      }
    })
    
    if (userByEmail.length > 0) {
      console.log(`✅ FOUND ${userByEmail.length} user(s) with this email:`)
      userByEmail.forEach((u, i) => {
        console.log(`\n${i + 1}. User ID: ${u.id}`)
        console.log(`   School: ${u.school.name} (${u.school.code})`)
        console.log(`   Email: ${u.email}`)
        console.log(`   Phone: ${u.phone}`)
        console.log(`   Username: ${u.username}`)
        console.log(`   Active: ${u.isActive}`)
      })
    } else {
      console.log('❌ NOT FOUND in User table')
    }
    
    // List all schools
    console.log('\n📋 All schools in database:')
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, code: true }
    })
    schools.forEach(s => {
      console.log(`   - ${s.name} (${s.code})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacherAllSchools()
