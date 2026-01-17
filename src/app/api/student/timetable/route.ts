/**
 * Student Timetable API Route
 * Requirement 23.5: Fetch class timetable entries for students
 * GET: Return timetable for authenticated student's class
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export interface TimetableLesson {
  period: number
  subject: string
  teacher: string
  room: string | null
}

export interface PeriodDefinition {
  number: number
  startTime: string
  endTime: string
}

export interface BreakDefinition {
  name: string
  startTime: string
  endTime: string
}

export interface StudentTimetableResponse {
  student: {
    name: string
    className: string
    streamName: string | null
  }
  currentTerm: string
  periods: PeriodDefinition[]
  breaks: BreakDefinition[]
  schedule: {
    Monday: TimetableLesson[]
    Tuesday: TimetableLesson[]
    Wednesday: TimetableLesson[]
    Thursday: TimetableLesson[]
    Friday: TimetableLesson[]
  }
}

// Default period times (can be customized per school)
const DEFAULT_PERIODS: PeriodDefinition[] = [
  { number: 1, startTime: '8:00', endTime: '8:40' },
  { number: 2, startTime: '8:45', endTime: '9:25' },
  { number: 3, startTime: '9:30', endTime: '10:10' },
  { number: 4, startTime: '10:30', endTime: '11:10' },
  { number: 5, startTime: '11:15', endTime: '11:55' },
  { number: 6, startTime: '12:00', endTime: '12:40' },
  { number: 7, startTime: '2:00', endTime: '2:40' },
  { number: 8, startTime: '2:45', endTime: '3:25' },
]

const DEFAULT_BREAKS: BreakDefinition[] = [
  { name: 'Break', startTime: '10:10', endTime: '10:30' },
  { name: 'Lunch', startTime: '12:40', endTime: '2:00' },
]

// Map day of week number to day name
const DAY_NAMES: Record<number, keyof StudentTimetableResponse['schedule']> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
}

// GET: Fetch timetable for authenticated student
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a student
    if (session.user.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: 'Forbidden - Student access only' },
        { status: 403 }
      )
    }

    const userId = session.user.id
    const schoolId = session.user.schoolId

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find student record
    const student = await prisma.student.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        stream: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!student) {
      return NextResponse.json({
        student: {
          name: 'Unknown',
          className: '',
          streamName: null
        },
        currentTerm: 'No active term',
        periods: DEFAULT_PERIODS,
        breaks: DEFAULT_BREAKS,
        schedule: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: []
        }
      })
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: { academicYear: true },
      orderBy: { startDate: 'desc' }
    })

    const termName = currentTerm 
      ? `${currentTerm.name} ${currentTerm.academicYear.name}` 
      : 'No active term'

    // Get timetable entries for the student's class
    const timetableEntries = await prisma.timetableEntry.findMany({
      where: { classId: student.classId },
      include: {
        subject: {
          select: { name: true }
        },
        staff: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' }
      ]
    })

    // Initialize schedule with empty arrays
    const schedule: StudentTimetableResponse['schedule'] = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: []
    }

    // Populate schedule from timetable entries
    for (const entry of timetableEntries) {
      const dayName = DAY_NAMES[entry.dayOfWeek]
      if (dayName) {
        schedule[dayName].push({
          period: entry.period,
          subject: entry.subject.name,
          teacher: `${entry.staff.firstName} ${entry.staff.lastName}`,
          room: entry.room
        })
      }
    }

    // Sort each day's lessons by period
    for (const day of Object.keys(schedule) as Array<keyof typeof schedule>) {
      schedule[day].sort((a, b) => a.period - b.period)
    }

    const response: StudentTimetableResponse = {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        className: student.class.name,
        streamName: student.stream?.name || null
      },
      currentTerm: termName,
      periods: DEFAULT_PERIODS,
      breaks: DEFAULT_BREAKS,
      schedule
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching student timetable:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timetable data' },
      { status: 500 }
    )
  }
}
