const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTeacher() {
  try {
    const schoolCode = 'HIBNS'
    
    console.log(`\n🔍 Searching for Biira Amelia in school: ${schoolCode}\n`)
    
    // Find school
    const school = await prisma.school.findUnique({
      where: { code: schoolCode },
      select: { id: true, name: true }
    })
    
    if (!school) {
      console.log('❌ School not found!')
      return
    }
    
    console.log(`✅ School found: ${school.name} (ID: ${school.id})\n`)
    
    // Search by name
    console.log('📋 Searching by name "Biira" or "Amelia"...')
    const staffByName = await prisma.staff.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { firstName: { contains: 'Biira', mode: 'insensitive' } },
          { lastName: { contains: 'Biira', mode: 'insensitive' } },
          { firstName: { contains: 'Amelia', mode: 'insensitive' } },
          { lastName: { contains: 'Amelia', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        userId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        status: true,
        primaryRole: true,
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
    
    if (staffByName.length > 0) {
      console.log(`✅ Found ${staffByName.length} staff member(s):`)
      staffByName.forEach(s => {
        console.log('\n' + '='.repeat(60))
        console.log(`Name: ${s.firstName} ${s.lastName}`)
        console.log(`Email: "${s.email}" (length: ${s.email?.length || 0})`)
        console.log(`Phone: ${s.phone}`)
        console.log(`Status: ${s.status}`)
        console.log(`Role: ${s.role}`)
        console.log(`Employment: ${s.employmentType}`)
        console.log(`User ID: ${s.userId}`)
        
        if (s.user) {
          console.log('\nLinked User:')
          console.log(`  - User ID: ${s.user.id}`)
          console.log(`  - Email: "${s.user.email}" (length: ${s.user.email?.length || 0})`)
          console.log(`  - Phone: ${s.user.phone}`)
          console.log(`  - Username: ${s.user.username}`)
          console.log(`  - Active: ${s.user.isActive}`)
        } else {
          console.log('\n❌ NO LINKED USER!')
        }
        
        // Check for hidden characters
        if (s.email) {
          const emailBytes = Buffer.from(s.email)
          console.log(`\nEmail hex: ${emailBytes.toString('hex')}`)
          console.log(`Email chars: ${s.email.split('').map(c => c.charCodeAt(0)).join(', ')}`)
        }
      })
    } else {
      console.log('❌ No staff found with name Biira or Amelia')
    }
    
    // Also check by phone
    console.log('\n\n📋 Searching by phone "0761000880"...')
    const staffByPhone = await prisma.staff.findFirst({
      where: {
        schoolId: school.id,
        phone: '0761000880',
      },
      select: {
        id: true,
        userId: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        status: true,
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
    
    if (staffByPhone) {
      console.log('✅ Found staff by phone:')
      console.log(JSON.stringify(staffByPhone, null, 2))
    } else {
      console.log('❌ No staff found with phone 0761000880')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeacher()
