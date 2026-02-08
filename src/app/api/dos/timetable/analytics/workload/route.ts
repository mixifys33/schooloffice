/**
 * Teacher Workload Analytics API
 * DoS-only endpoint for analyzing teacher workload distribution
 * 
 * Critical for DoS oversight - answers questions like:
 * - Who is overloaded?
 * - Which class is under-served?
 * - How balanced is the workload?
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { timetableService } from '@/services/timetable.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Only DoS can view workload analytics
    if (!['DOS', 'ADMIN', 'SCHOOL_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only Director of Studies can view workload analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timetableId = searchParams.get('timetableId')

    if (!timetableId) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      )
    }

    // Analyze teacher workload
    const workloadAnalysis = await timetableService.analyzeTeacherWorkload(
      schoolId,
      timetableId
    )

    // Calculate summary statistics
    const totalTeachers = workloadAnalysis.length
    const overloadedTeachers = workloadAnalysis.filter(t => 
      t.workloadRating === 'OVERLOADED' || t.workloadRating === 'CRITICAL'
    ).length
    const underloadedTeachers = workloadAnalysis.filter(t => 
      t.workloadRating === 'UNDERLOADED'
    ).length
    const averagePeriods = workloadAnalysis.reduce((sum, t) => sum + t.totalPeriods, 0) / totalTeachers

    return NextResponse.json({
      success: true,
      summary: {
        totalTeachers,
        overloadedTeachers,
        underloadedTeachers,
        balancedTeachers: totalTeachers - overloadedTeachers - underloadedTeachers,
        averagePeriods: Math.round(averagePeriods * 10) / 10
      },
      teachers: workloadAnalysis,
      insights: {
        needsAttention: overloadedTeachers > 0 || underloadedTeachers > totalTeachers * 0.3,
        balanceScore: Math.max(0, 100 - (overloadedTeachers * 20) - (underloadedTeachers * 10)),
        recommendations: generateWorkloadRecommendations(workloadAnalysis)
      }
    })

  } catch (error) {
    console.error('Error analyzing teacher workload:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to analyze workload'
      },
      { status: 500 }
    )
  }
}

function generateWorkloadRecommendations(analysis: any[]): string[] {
  const recommendations: string[] = []
  
  const overloaded = analysis.filter(t => t.workloadRating === 'OVERLOADED' || t.workloadRating === 'CRITICAL')
  const underloaded = analysis.filter(t => t.workloadRating === 'UNDERLOADED')
  
  if (overloaded.length > 0) {
    recommendations.push(`${overloaded.length} teacher${overloaded.length > 1 ? 's are' : ' is'} overloaded. Consider redistributing lessons.`)
  }
  
  if (underloaded.length > 0) {
    recommendations.push(`${underloaded.length} teacher${underloaded.length > 1 ? 's have' : ' has'} capacity for more lessons.`)
  }
  
  const highConsecutive = analysis.filter(t => t.consecutiveLessonsCount > 4)
  if (highConsecutive.length > 0) {
    recommendations.push(`${highConsecutive.length} teacher${highConsecutive.length > 1 ? 's have' : ' has'} too many consecutive lessons.`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Workload distribution looks balanced.')
  }
  
  return recommendations
}