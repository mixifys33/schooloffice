import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

/**
 * GET /api/dos/timetable/[id]/inspect
 * 
 * Get comprehensive inspection data for a timetable
 * - Quality score
 * - Conflict summary
 * - Teacher workload analysis
 * - Room utilization analysis
 * - Subject coverage tracking
 * - Optimization suggestions
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
          }
        }
      }
    })

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    // 6. Calculate quality score
    const qualityScore = calculateQualityScore(timetable.entries)

    // 7. Detect conflicts
    const conflicts = await detectConflicts(timetable.id, timetable.term.id, schoolId)

    // 8. Analyze teacher workload
    const teacherWorkload = analyzeTeacherWorkload(timetable.entries)

    // 9. Analyze room utilization
    const roomUtilization = analyzeRoomUtilization(timetable.entries)

    // 10. Track subject coverage
    const subjectCoverage = await analyzeSubjectCoverage(
      timetable.id,
      timetable.class.id,
      timetable.entries
    )

    // 11. Generate suggestions
    const suggestions = generateSuggestions(
      qualityScore,
      conflicts,
      teacherWorkload,
      roomUtilization,
      subjectCoverage
    )

    return NextResponse.json({
      timetable: {
        id: timetable.id,
        name: timetable.name,
        class: timetable.class,
        term: timetable.term,
        status: timetable.status,
        isLocked: timetable.isLocked,
        entryCount: timetable.entries.length
      },
      qualityScore,
      conflicts,
      teacherWorkload,
      roomUtilization,
      subjectCoverage,
      suggestions
    })

  } catch (error) {
    console.error('❌ [DoS Timetable Inspect] Error:', error)
    return NextResponse.json(
      { error: 'Failed to inspect timetable' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(entries: any[]): {
  overall: number
  breakdown: {
    teacherGaps: number
    heavySubjectsAfternoon: number
    workloadBalance: number
    subjectDistribution: number
  }
} {
  let score = 100
  const breakdown = {
    teacherGaps: 100,
    heavySubjectsAfternoon: 100,
    workloadBalance: 100,
    subjectDistribution: 100
  }

  // 1. Teacher gaps
  const teacherGaps = calculateTeacherGaps(entries)
  const gapPenalty = teacherGaps * 10
  breakdown.teacherGaps = Math.max(0, 100 - gapPenalty)
  score -= gapPenalty

  // 2. Heavy subjects in afternoon
  const heavyAfternoon = countHeavySubjectsAfternoon(entries)
  const heavyPenalty = heavyAfternoon * 5
  breakdown.heavySubjectsAfternoon = Math.max(0, 100 - heavyPenalty)
  score -= heavyPenalty

  // 3. Workload balance
  const workloadVariance = calculateWorkloadVariance(entries)
  const balancePenalty = workloadVariance * 3
  breakdown.workloadBalance = Math.max(0, 100 - balancePenalty)
  score -= balancePenalty

  // 4. Subject distribution
  const clustering = calculateSubjectClustering(entries)
  const clusterPenalty = clustering * 2
  breakdown.subjectDistribution = Math.max(0, 100 - clusterPenalty)
  score -= clusterPenalty

  return {
    overall: Math.max(0, Math.round(score * 10) / 10),
    breakdown
  }
}

function calculateTeacherGaps(entries: any[]): number {
  const teacherSchedules = new Map<string, number[]>()

  for (const entry of entries) {
    if (!entry.teacher) continue

    const teacherId = entry.teacher.id
    if (!teacherSchedules.has(teacherId)) {
      teacherSchedules.set(teacherId, [])
    }

    const slotIndex = (entry.dayOfWeek - 1) * 8 + entry.period
    teacherSchedules.get(teacherId)!.push(slotIndex)
  }

  let totalGaps = 0
  for (const [_, slots] of teacherSchedules) {
    slots.sort((a, b) => a - b)
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i] - slots[i - 1] - 1
      if (gap > 0 && gap <= 3) { // Only count gaps within same day
        totalGaps += gap
      }
    }
  }

  return totalGaps
}

function countHeavySubjectsAfternoon(entries: any[]): number {
  const heavySubjects = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology']
  let count = 0

  for (const entry of entries) {
    const subjectName = entry.curriculumSubject?.subject?.name || ''
    const isHeavy = heavySubjects.some(h => subjectName.includes(h))
    const isAfternoon = entry.period > 4

    if (isHeavy && isAfternoon) {
      count++
    }
  }

  return count
}

function calculateWorkloadVariance(entries: any[]): number {
  const dailyLoad = [0, 0, 0, 0, 0] // Mon-Fri

  for (const entry of entries) {
    dailyLoad[entry.dayOfWeek - 1]++
  }

  const avg = dailyLoad.reduce((a, b) => a + b, 0) / 5
  const variance = dailyLoad.reduce((sum, load) => sum + Math.pow(load - avg, 2), 0) / 5

  return Math.round(variance * 10) / 10
}

function calculateSubjectClustering(entries: any[]): number {
  const subjectDays = new Map<string, Set<number>>()

  for (const entry of entries) {
    const subjectId = entry.curriculumSubject?.subject?.id
    if (!subjectId) continue

    if (!subjectDays.has(subjectId)) {
      subjectDays.set(subjectId, new Set())
    }
    subjectDays.get(subjectId)!.add(entry.dayOfWeek)
  }

  let clustering = 0
  for (const [_, days] of subjectDays) {
    const daysArray = Array.from(days).sort()
    for (let i = 1; i < daysArray.length; i++) {
      if (daysArray[i] - daysArray[i - 1] === 1) {
        clustering++
      }
    }
  }

  return clustering
}

/**
 * Detect conflicts
 */
async function detectConflicts(
  timetableId: string,
  termId: string,
  schoolId: string
): Promise<Array<{
  type: string
  severity: 'high' | 'medium' | 'low'
  message: string
  affectedEntries: string[]
}>> {
  const conflicts: any[] = []

  // Get all entries for this timetable
  const entries = await prisma.doSTimetableEntry.findMany({
    where: { timetableId },
    include: {
      curriculumSubject: {
        include: { subject: true }
      },
      teacher: true
    }
  })

  // Check teacher double-booking
  for (const entry of entries) {
    if (!entry.teacher) continue

    const otherEntries = await prisma.doSTimetableEntry.findMany({
      where: {
        teacherId: entry.teacherId,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
        timetable: {
          termId,
          id: { not: timetableId }
        }
      },
      include: {
        timetable: { include: { class: true } },
        curriculumSubject: { include: { subject: true } }
      }
    })

    if (otherEntries.length > 0) {
      conflicts.push({
        type: 'TEACHER_DOUBLE_BOOKING',
        severity: 'high' as const,
        message: `${entry.teacher.firstName} ${entry.teacher.lastName} is teaching ${otherEntries[0].curriculumSubject.subject.name} in ${otherEntries[0].timetable.class.name} at the same time`,
        affectedEntries: [entry.id, ...otherEntries.map(e => e.id)]
      })
    }
  }

  // Check room double-booking
  for (const entry of entries) {
    if (!entry.room) continue

    const otherEntries = await prisma.doSTimetableEntry.findMany({
      where: {
        room: entry.room,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
        timetable: {
          termId,
          id: { not: timetableId }
        }
      },
      include: {
        timetable: { include: { class: true } },
        curriculumSubject: { include: { subject: true } }
      }
    })

    if (otherEntries.length > 0) {
      conflicts.push({
        type: 'ROOM_DOUBLE_BOOKING',
        severity: 'medium' as const,
        message: `Room ${entry.room} is occupied by ${otherEntries[0].timetable.class.name} (${otherEntries[0].curriculumSubject.subject.name}) at the same time`,
        affectedEntries: [entry.id, ...otherEntries.map(e => e.id)]
      })
    }
  }

  return conflicts
}

/**
 * Analyze teacher workload
 */
function analyzeTeacherWorkload(entries: any[]): Array<{
  teacher: {
    id: string
    name: string
    employeeNumber: string
  }
  periodsPerWeek: number
  periodsPerDay: { [day: number]: number }
  gaps: number
  subjects: string[]
}> {
  const workload = new Map<string, any>()

  for (const entry of entries) {
    if (!entry.teacher) continue

    const teacherId = entry.teacher.id
    if (!workload.has(teacherId)) {
      workload.set(teacherId, {
        teacher: {
          id: entry.teacher.id,
          name: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
          employeeNumber: entry.teacher.employeeNumber
        },
        periodsPerWeek: 0,
        periodsPerDay: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        gaps: 0,
        subjects: new Set<string>()
      })
    }

    const data = workload.get(teacherId)
    data.periodsPerWeek++
    data.periodsPerDay[entry.dayOfWeek]++
    data.subjects.add(entry.curriculumSubject?.subject?.name || 'Unknown')
  }

  // Calculate gaps
  for (const [teacherId, data] of workload) {
    const teacherEntries = entries
      .filter(e => e.teacher?.id === teacherId)
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
        return a.period - b.period
      })

    let gaps = 0
    for (let i = 1; i < teacherEntries.length; i++) {
      const prev = teacherEntries[i - 1]
      const curr = teacherEntries[i]

      if (prev.dayOfWeek === curr.dayOfWeek) {
        const gap = curr.period - prev.period - 1
        if (gap > 0) gaps += gap
      }
    }

    data.gaps = gaps
    data.subjects = Array.from(data.subjects)
  }

  return Array.from(workload.values())
}

/**
 * Analyze room utilization
 */
function analyzeRoomUtilization(entries: any[]): Array<{
  room: string
  periodsUsed: number
  utilizationRate: number
  schedule: { [day: number]: number[] }
}> {
  const utilization = new Map<string, any>()

  for (const entry of entries) {
    if (!entry.room) continue

    if (!utilization.has(entry.room)) {
      utilization.set(entry.room, {
        room: entry.room,
        periodsUsed: 0,
        schedule: { 1: [], 2: [], 3: [], 4: [], 5: [] }
      })
    }

    const data = utilization.get(entry.room)
    data.periodsUsed++
    data.schedule[entry.dayOfWeek].push(entry.period)
  }

  // Calculate utilization rate (out of 40 total periods)
  for (const data of utilization.values()) {
    data.utilizationRate = Math.round((data.periodsUsed / 40) * 100)
  }

  return Array.from(utilization.values())
}

/**
 * Analyze subject coverage
 */
async function analyzeSubjectCoverage(
  timetableId: string,
  classId: string,
  entries: any[]
): Promise<Array<{
  subject: {
    id: string
    name: string
    code: string
  }
  required: number
  assigned: number
  coverage: number
  status: 'complete' | 'partial' | 'missing'
}>> {
  // Get required subjects
  const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
    where: { classId },
    include: { subject: true }
  })

  const coverage = curriculumSubjects.map(cs => {
    const assigned = entries.filter(
      e => e.curriculumSubject?.subjectId === cs.subjectId
    ).length

    const coveragePercent = Math.round((assigned / cs.periodsPerWeek) * 100)

    let status: 'complete' | 'partial' | 'missing'
    if (assigned === 0) status = 'missing'
    else if (assigned < cs.periodsPerWeek) status = 'partial'
    else status = 'complete'

    return {
      subject: {
        id: cs.subject.id,
        name: cs.subject.name,
        code: cs.subject.code
      },
      required: cs.periodsPerWeek,
      assigned,
      coverage: coveragePercent,
      status
    }
  })

  return coverage
}

/**
 * Generate suggestions
 */
function generateSuggestions(
  qualityScore: any,
  conflicts: any[],
  teacherWorkload: any[],
  roomUtilization: any[],
  subjectCoverage: any[]
): string[] {
  const suggestions: string[] = []

  // Quality score suggestions
  if (qualityScore.breakdown.teacherGaps < 80) {
    suggestions.push('Reduce teacher gaps by rearranging lessons to be more consecutive')
  }

  if (qualityScore.breakdown.heavySubjectsAfternoon < 80) {
    suggestions.push('Move heavy subjects (Math, Science) to morning periods for better student focus')
  }

  if (qualityScore.breakdown.workloadBalance < 80) {
    suggestions.push('Balance daily workload more evenly across the week')
  }

  if (qualityScore.breakdown.subjectDistribution < 80) {
    suggestions.push('Spread subjects more evenly to avoid consecutive days')
  }

  // Conflict suggestions
  if (conflicts.length > 0) {
    suggestions.push(`Resolve ${conflicts.length} conflict(s) before publishing timetable`)
  }

  // Teacher workload suggestions
  const overloadedTeachers = teacherWorkload.filter(t => t.periodsPerWeek > 30)
  if (overloadedTeachers.length > 0) {
    suggestions.push(`${overloadedTeachers.length} teacher(s) have >30 periods/week - consider redistributing`)
  }

  const teachersWithGaps = teacherWorkload.filter(t => t.gaps > 5)
  if (teachersWithGaps.length > 0) {
    suggestions.push(`${teachersWithGaps.length} teacher(s) have >5 gaps - consider consolidating their schedule`)
  }

  // Room utilization suggestions
  const underutilizedRooms = roomUtilization.filter(r => r.utilizationRate < 30)
  if (underutilizedRooms.length > 0) {
    suggestions.push(`${underutilizedRooms.length} room(s) are underutilized (<30%) - consider consolidating`)
  }

  // Subject coverage suggestions
  const missingSubjects = subjectCoverage.filter(s => s.status === 'missing')
  if (missingSubjects.length > 0) {
    suggestions.push(`${missingSubjects.length} subject(s) have no periods assigned yet`)
  }

  const partialSubjects = subjectCoverage.filter(s => s.status === 'partial')
  if (partialSubjects.length > 0) {
    suggestions.push(`${partialSubjects.length} subject(s) need more periods to meet requirements`)
  }

  return suggestions
}
