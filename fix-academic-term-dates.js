const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAcademicTermDates() {
  try {
    console.log('🔧 Fixing Academic Term Dates...\n')

    const today = new Date()
    console.log(`Today's date: ${today.toDateString()}\n`)

    // Get the active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: {
        isActive: true
      },
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      }
    })

    if (!activeYear) {
      console.log('❌ No active academic year found')
      return
    }

    console.log(`📚 Active Academic Year: ${activeYear.name}`)
    console.log(`   Period: ${activeYear.startDate.toDateString()} - ${activeYear.endDate.toDateString()}\n`)

    // Check current term situation
    console.log('📅 Current Terms:')
    activeYear.terms.forEach((term, index) => {
      const isCurrentTerm = term.startDate <= today && term.endDate >= today
      const isPastTerm = term.endDate < today
      const isFutureTerm = term.startDate > today
      
      let status = '⚪ NOT CURRENT'
      if (isCurrentTerm) status = '🟢 CURRENT'
      else if (isPastTerm) status = '🔴 PAST'
      else if (isFutureTerm) status = '🔵 FUTURE'
      
      console.log(`   ${index + 1}. ${term.name}: ${term.startDate.toDateString()} - ${term.endDate.toDateString()} ${status}`)
    })

    // Find the closest term to today
    let termToAdjust = null
    let minDaysDiff = Infinity

    for (const term of activeYear.terms) {
      const startDiff = Math.abs((term.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (startDiff < minDaysDiff) {
        minDaysDiff = startDiff
        termToAdjust = term
      }
    }

    if (!termToAdjust) {
      console.log('❌ No terms found to adjust')
      return
    }

    console.log(`\n🎯 Closest term to today: ${termToAdjust.name}`)
    console.log(`   Current dates: ${termToAdjust.startDate.toDateString()} - ${termToAdjust.endDate.toDateString()}`)
    console.log(`   Days difference from start: ${Math.ceil(minDaysDiff)}`)

    // Option 1: If term starts tomorrow or within a few days, adjust it to start today
    if (termToAdjust.startDate > today && minDaysDiff <= 3) {
      console.log('\n🔧 Adjusting term to start today...')
      
      const updatedTerm = await prisma.term.update({
        where: { id: termToAdjust.id },
        data: {
          startDate: today
        }
      })
      
      console.log(`✅ Updated ${termToAdjust.name} to start today: ${today.toDateString()}`)
    }
    // Option 2: If we're before the academic year starts, adjust the academic year
    else if (today < activeYear.startDate) {
      console.log('\n🔧 Adjusting academic year to start today...')
      
      await prisma.academicYear.update({
        where: { id: activeYear.id },
        data: {
          startDate: today
        }
      })
      
      await prisma.term.update({
        where: { id: termToAdjust.id },
        data: {
          startDate: today
        }
      })
      
      console.log(`✅ Updated academic year and ${termToAdjust.name} to start today`)
    }
    // Option 3: Create a bridge term for the current period
    else {
      console.log('\n🔧 Creating a bridge term for current period...')
      
      // Calculate end date (either start of next term or 3 months from now)
      const nextTerm = activeYear.terms.find(t => t.startDate > today)
      const endDate = nextTerm ? 
        new Date(nextTerm.startDate.getTime() - 24 * 60 * 60 * 1000) : // Day before next term
        new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) // 3 months from now
      
      const bridgeTerm = await prisma.term.create({
        data: {
          academicYearId: activeYear.id,
          name: 'Bridge Term',
          startDate: today,
          endDate: endDate,
          weekCount: Math.ceil((endDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000))
        }
      })
      
      console.log(`✅ Created bridge term: ${today.toDateString()} - ${endDate.toDateString()}`)
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...')
    
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          isActive: true
        },
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        academicYear: true
      }
    })

    if (currentTerm) {
      console.log(`✅ SUCCESS! Current term found: ${currentTerm.name}`)
      console.log(`   Academic Year: ${currentTerm.academicYear.name}`)
      console.log(`   Period: ${currentTerm.startDate.toDateString()} - ${currentTerm.endDate.toDateString()}`)
    } else {
      console.log('❌ Still no current term found. Manual intervention may be needed.')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAcademicTermDates()