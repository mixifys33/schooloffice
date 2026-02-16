/**
 * DoS Assessment Control API
 * Provides overview of all CA entries across the school for DoS monitoring
 * Uses CAEntry model (same as class teacher)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No school context found'
        },
        { status: 400 }
      )
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    // Check if user has DoS role
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    const isDoS = staff && (
      staff.primaryRole === StaffRole.DOS ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
    )

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Director of Studies access required'
        },
        { status: 403 }
      )
    }

    // Get current term
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    if (!currentTerm) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalPlans: 0,
            approvedPlans: 0,
            pendingPlans: 0,
            overduePlans: 0,
            completionRate: 0,
            averageScore: 0,
            qualityScore: 0,
          },
          planStatus: [],
          criticalIssues: [],
          systemStatus: {
            caEntryOpen: false,
            deadlinesEnforced: true,
          },
        },
      })
    }

    // Get all CA entries for current term grouped by name/type/subject/class
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        student: {
          select: {
            id: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Group CA entries by unique assessment (name + type + subject + class)
    const assessmentGroups = new Map<string, typeof caEntries>()
    
    for (const entry of caEntries) {
      const key = `${entry.name}-${entry.type}-${entry.subjectId}-${entry.student.class.id}`
      if (!assessmentGroups.has(key)) {
        assessmentGroups.set(key, [])
      }
      assessmentGroups.get(key)!.push(entry)
    }

    // Calculate statistics for each assessment group
    const planStatus = Array.from(assessmentGroups.entries()).map(([key, entries]) => {
      const firstEntry = entries[0]
      const totalStudents = entries.length
      const entriesWithScores = entries.filter(e => e.score !== null && e.score > 0).length
      const completionRate = totalStudents > 0 ? (entriesWithScores / totalStudents) * 100 : 0
      
      // Calculate average score
      const scoresArray = entries
        .filter(e => e.score !== null && e.score > 0)
        .map(e => e.score as number)
      const averageScore = scoresArray.length > 0
        ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
        : 0

      // Check if overdue (if dueDate exists and is in the past)
      const isOverdue = false // CA entries don't have dueDate in current schema
      
      // Check for anomalies (e.g., all same scores, suspiciously high/low averages)
      const hasAnomalies = false // Simplified for now

      // Check if all entries are submitted
      const allSubmitted = entries.every(e => e.status === 'SUBMITTED')

      return {
        id: firstEntry.id,
        subjectName: firstEntry.subject.name,
        className: firstEntry.student.class.name,
        teacherName: `${firstEntry.teacher.firstName} ${firstEntry.teacher.lastName}`,
        assessmentType: firstEntry.type,
        assessmentName: firstEntry.name,
        maxScore: firstEntry.maxScore,
        weightPercentage: 20, // CA is 20% of final grade
        dueDate: new Date().toISOString(), // Placeholder
        isOverdue,
        dosApproved: allSubmitted,
        entriesCount: entriesWithScores,
        expectedEntries: totalStudents,
        completionRate,
        averageScore,
        hasAnomalies,
        canApprove: completionRate === 100 && !allSubmitted,
      }
    })

    // Calculate overview statistics
    const totalPlans = planStatus.length
    const approvedPlans = planStatus.filter(p => p.dosApproved).length
    const pendingPlans = totalPlans - approvedPlans
    const overduePlans = planStatus.filter(p => p.isOverdue).length
    
    const avgCompletionRate = planStatus.length > 0
      ? planStatus.reduce((sum, p) => sum + p.completionRate, 0) / planStatus.length
      : 0
    
    const avgScore = planStatus.length > 0
      ? planStatus.reduce((sum, p) => sum + p.averageScore, 0) / planStatus.length
      : 0
    
    const qualityScore = avgCompletionRate // Simplified quality metric

    // Identify critical issues
    const criticalIssues = []
    
    // Issue: Low completion rates
    const lowCompletionPlans = planStatus.filter(p => p.completionRate < 50)
    if (lowCompletionPlans.length > 0) {
      criticalIssues.push({
        id: 'low-completion',
        type: 'COMPLETION',
        title: 'Low CA Entry Completion',
        description: `${lowCompletionPlans.length} assessments have less than 50% completion`,
        severity: 'HIGH' as const,
        affectedClasses: new Set(lowCompletionPlans.map(p => p.className)).size,
        actionUrl: '/dos/assessments',
      })
    }

    // Issue: Pending approvals
    if (pendingPlans > 5) {
      criticalIssues.push({
        id: 'pending-approvals',
        type: 'APPROVAL',
        title: 'Multiple Pending Approvals',
        description: `${pendingPlans} assessments awaiting DoS approval`,
        severity: 'MEDIUM' as const,
        affectedClasses: new Set(planStatus.filter(p => !p.dosApproved).map(p => p.className)).size,
        actionUrl: '/dos/assessments',
      })
    }

    // System status
    const termStart = new Date(currentTerm.startDate)
    const termEnd = new Date(currentTerm.endDate)
    const caEntryOpen = today >= termStart && today <= termEnd

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalPlans,
          approvedPlans,
          pendingPlans,
          overduePlans,
          completionRate: avgCompletionRate,
          averageScore: avgScore,
          qualityScore,
        },
        planStatus,
        criticalIssues,
        systemStatus: {
          caEntryOpen,
          deadlinesEnforced: true,
        },
      },
    })

  } catch (error) {
    console.error('Error fetching DoS assessments:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch assessments'
    }, { status: 500 })
  }
}
