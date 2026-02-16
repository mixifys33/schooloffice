import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

/**
 * GET /api/dos/timetable/[id]/export/excel
 * 
 * Export timetable as CSV (Excel-compatible)
 * Can be opened in Excel, Google Sheets, etc.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get school context
    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // 3. Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { primaryRole: true, secondaryRoles: true }
      })

      const isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      )

      if (!isDoS) {
        return NextResponse.json({ error: 'Director of Studies access required' }, { status: 403 })
      }
    }

    // 4. Get timetable ID
    const { id } = await params

    // 5. Fetch timetable with all entries
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id, schoolId },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, startDate: true, endDate: true } },
        school: { select: { name: true } },
        entries: {
          include: {
            curriculumSubject: {
              include: {
                subject: { select: { id: true, name: true, code: true } }
              }
            },
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { period: 'asc' }
          ]
        }
      }
    })

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    // 6. Generate CSV
    const csv = generateCSV(timetable)

    // 7. Return CSV response
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${timetable.name.replace(/\s+/g, '_')}.csv"`
      }
    })

  } catch (error) {
    console.error('❌ [DoS Timetable Export Excel] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export timetable' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateCSV(timetable: any): string {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  // Build grid data
  const grid: { [key: string]: any } = {}
  for (const entry of timetable.entries) {
    const key = `${entry.dayOfWeek}-${entry.period}`
    grid[key] = entry
  }

  // CSV rows
  const rows: string[] = []

  // Header rows
  rows.push(`"${timetable.school.name}"`)
  rows.push(`"${timetable.name}"`)
  rows.push(`"Class: ${timetable.class.name} | Term: ${timetable.term.name} | Generated: ${new Date().toLocaleDateString()}"`)
  rows.push('') // Empty row

  // Table header
  rows.push(`"Period",${dayNames.map(day => `"${day}"`).join(',')}`)

  // Table rows
  for (const period of periods) {
    const cells: string[] = [`"Period ${period}"`]

    for (let dayIndex = 0; dayIndex < dayNames.length; dayIndex++) {
      const dayOfWeek = dayIndex + 1
      const key = `${dayOfWeek}-${period}`
      const entry = grid[key]

      if (entry) {
        const teacherName = `${entry.teacher.firstName} ${entry.teacher.lastName}`
        const subjectName = entry.curriculumSubject.subject.name
        const room = entry.room || ''

        const cellContent = `${subjectName}\n${teacherName}${room ? `\nRoom: ${room}` : ''}`
        cells.push(`"${cellContent.replace(/"/g, '""')}"`) // Escape quotes
      } else {
        cells.push('"-"')
      }
    }

    rows.push(cells.join(','))
  }

  // Footer rows
  rows.push('') // Empty row
  rows.push(`"Status: ${timetable.status} | Total Entries: ${timetable.entries.length} | ${timetable.isLocked ? 'Locked' : 'Unlocked'}"`)

  return rows.join('\n')
}
