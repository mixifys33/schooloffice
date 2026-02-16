import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

/**
 * GET /api/dos/timetable/[id]/export/pdf
 * 
 * Export timetable as PDF (print-ready format)
 * Returns HTML that can be printed or converted to PDF
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

    // 6. Generate HTML for PDF
    const html = generatePDFHTML(timetable)

    // 7. Return HTML response
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${timetable.name.replace(/\s+/g, '_')}.html"`
      }
    })

  } catch (error) {
    console.error('❌ [DoS Timetable Export PDF] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export timetable' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generatePDFHTML(timetable: any): string {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  // Build grid data
  const grid: { [key: string]: any } = {}
  for (const entry of timetable.entries) {
    const key = `${entry.dayOfWeek}-${entry.period}`
    grid[key] = entry
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${timetable.name} - ${timetable.class.name}</title>
  <style>
    @media print {
      @page {
        size: A4 landscape;
        margin: 1cm;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      padding: 20px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }

    .header h1 {
      font-size: 24px;
      color: #333;
      margin-bottom: 5px;
    }

    .header h2 {
      font-size: 18px;
      color: #666;
      font-weight: normal;
      margin-bottom: 5px;
    }

    .header p {
      font-size: 14px;
      color: #888;
    }

    .timetable-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .timetable-table th,
    .timetable-table td {
      border: 1px solid #333;
      padding: 8px;
      text-align: center;
      vertical-align: top;
    }

    .timetable-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 14px;
    }

    .timetable-table td {
      height: 80px;
      font-size: 12px;
    }

    .period-header {
      background-color: #e0e0e0;
      font-weight: bold;
      width: 80px;
    }

    .entry {
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 100%;
    }

    .subject-name {
      font-weight: bold;
      color: #333;
      font-size: 13px;
    }

    .teacher-name {
      color: #666;
      font-size: 11px;
    }

    .room-name {
      color: #888;
      font-size: 10px;
    }

    .empty-slot {
      color: #ccc;
      font-style: italic;
    }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    .print-button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header">
    <h1>${timetable.school.name}</h1>
    <h2>${timetable.name}</h2>
    <p>
      <strong>Class:</strong> ${timetable.class.name} &nbsp;|&nbsp;
      <strong>Term:</strong> ${timetable.term.name} &nbsp;|&nbsp;
      <strong>Generated:</strong> ${new Date().toLocaleDateString()}
    </p>
  </div>

  <table class="timetable-table">
    <thead>
      <tr>
        <th class="period-header">Period</th>
        ${dayNames.map(day => `<th>${day}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${periods.map(period => `
        <tr>
          <td class="period-header">Period ${period}</td>
          ${dayNames.map((_, dayIndex) => {
            const dayOfWeek = dayIndex + 1
            const key = `${dayOfWeek}-${period}`
            const entry = grid[key]

            if (entry) {
              const teacherName = `${entry.teacher.firstName} ${entry.teacher.lastName}`
              const subjectName = entry.curriculumSubject.subject.name
              const room = entry.room || ''

              return `
                <td>
                  <div class="entry">
                    <div class="subject-name">${subjectName}</div>
                    <div class="teacher-name">${teacherName}</div>
                    ${room ? `<div class="room-name">Room: ${room}</div>` : ''}
                  </div>
                </td>
              `
            } else {
              return `<td><div class="empty-slot">-</div></td>`
            }
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>
      <strong>Status:</strong> ${timetable.status} &nbsp;|&nbsp;
      <strong>Total Entries:</strong> ${timetable.entries.length} &nbsp;|&nbsp;
      ${timetable.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
    </p>
    <p style="margin-top: 10px;">
      This timetable was generated by the School Management System on ${new Date().toLocaleString()}
    </p>
  </div>

  <script>
    // Auto-print on load (optional)
    // window.onload = () => window.print();
  </script>
</body>
</html>
  `.trim()
}
