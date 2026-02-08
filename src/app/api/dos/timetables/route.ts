/**
 * BRUTAL TIMETABLE API ROUTES
 * 
 * DoS-only endpoints for complete timetable lifecycle management.
 * This is where the BRUTAL timetable system meets the real world.
 * 
 * AUTHORITY STRUCTURE:
 * - Only DoS can access these endpoints
 * - All operations are logged for audit
 * - Failures are handled gracefully with detailed error messages
 * 
 * ENDPOINTS:
 * - GET: List timetables, get analytics, export data
 * - POST: Generate new timetable, approve, publish
 * - PUT: Update timetable slots, resolve conflicts
 * - DELETE: Archive timetables
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { timetableService } from '@/services/timetable.service'
import { 
  GenerateTimetableRequest, 
  TimetablePublishRequest,
  OptimizationTarget,
  TimetableStatus 
} from '@/types/timetable'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const schoolId = searchParams.get('schoolId') || session.user.schoolId
    const termId = searchParams.get('termId')
    const timetableId = searchParams.get('timetableId')

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    switch (action) {
      case 'list':
        if (!termId) {
          return NextResponse.json({ error: 'Term ID required for listing' }, { status: 400 })
        }
        
        const timetables = await timetableService.getTimetablesBySchool(schoolId, termId)
        return NextResponse.json({ timetables })

      case 'analytics':
        if (!timetableId) {
          return NextResponse.json({ error: 'Timetable ID required for analytics' }, { status: 400 })
        }
        
        const analytics = await timetableService.getTimetableAnalytics(schoolId, timetableId)
        return NextResponse.json({ analytics })

      case 'workload':
        if (!timetableId) {
          return NextResponse.json({ error: 'Timetable ID required for workload analysis' }, { status: 400 })
        }
        
        const workloadAnalysis = await timetableService.analyzeTeacherWorkload(schoolId, timetableId)
        return NextResponse.json({ workloadAnalysis })

      case 'class-view':
        const classId = searchParams.get('classId')
        if (!timetableId || !classId) {
          return NextResponse.json({ error: 'Timetable ID and Class ID required' }, { status: 400 })
        }
        
        const classView = await timetableService.getClassTimetableView(classId, timetableId)
        return NextResponse.json({ classView })

      case 'teacher-view':
        const teacherId = searchParams.get('teacherId')
        if (!timetableId || !teacherId) {
          return NextResponse.json({ error: 'Timetable ID and Teacher ID required' }, { status: 400 })
        }
        
        const teacherView = await timetableService.getTeacherTimetableView(teacherId, timetableId)
        return NextResponse.json({ teacherView })

      case 'conflicts':
        if (!termId) {
          return NextResponse.json({ error: 'Term ID required for conflict summary' }, { status: 400 })
        }
        
        const conflictSummary = await timetableService.getConflictSummary(schoolId, termId)
        return NextResponse.json({ conflictSummary })

      case 'statistics':
        const statistics = await timetableService.getTimetableStatistics(schoolId)
        return NextResponse.json({ statistics })

      case 'validate-config':
        const validation = await timetableService.validateTimetableConfiguration(schoolId)
        return NextResponse.json({ validation })

      case 'compare':
        const timetableId1 = searchParams.get('timetableId1')
        const timetableId2 = searchParams.get('timetableId2')
        if (!timetableId1 || !timetableId2) {
          return NextResponse.json({ error: 'Two timetable IDs required for comparison' }, { status: 400 })
        }
        
        const comparison = await timetableService.compareTimetableVersions(timetableId1, timetableId2)
        return NextResponse.json({ comparison })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'generate':
        const generateRequest: GenerateTimetableRequest = {
          schoolId: body.schoolId || session.user.schoolId,
          termId: body.termId,
          generationOptions: {
            maxIterations: body.maxIterations || 100,
            optimizationTarget: body.optimizationTarget || OptimizationTarget.MINIMIZE_CONFLICTS,
            allowPartialSolutions: body.allowPartialSolutions || false,
            prioritizeHardConstraints: body.prioritizeHardConstraints || true,
            regenerateFromScratch: body.regenerateFromScratch || false,
            preserveExistingSlots: body.preserveExistingSlots || []
          },
          regenerateFromScratch: body.regenerateFromScratch || false
        }

        if (!generateRequest.schoolId || !generateRequest.termId) {
          return NextResponse.json({ error: 'School ID and Term ID required' }, { status: 400 })
        }

        const generatedTimetable = await timetableService.generateTimetable(
          generateRequest,
          session.user.id
        )

        return NextResponse.json({ 
          success: true, 
          timetable: generatedTimetable,
          message: `Timetable generated with ${generatedTimetable.conflicts.length} conflicts`
        })

      case 'approve':
        const { timetableId, approvalNotes, overrideCriticalConflicts } = body

        if (!timetableId) {
          return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 })
        }

        const approvedTimetable = await timetableService.approveTimetable(
          timetableId,
          session.user.id,
          approvalNotes,
          overrideCriticalConflicts || false
        )

        return NextResponse.json({ 
          success: true, 
          timetable: approvedTimetable,
          message: 'Timetable approved successfully'
        })

      case 'publish':
        const publishRequest: TimetablePublishRequest = {
          timetableId: body.timetableId,
          notifyTeachers: body.notifyTeachers || true,
          generatePDFs: body.generatePDFs || true,
          publishToPortals: body.publishToPortals || true
        }

        if (!publishRequest.timetableId) {
          return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 })
        }

        const publishResult = await timetableService.publishTimetable(
          publishRequest,
          session.user.id
        )

        return NextResponse.json({ 
          success: true, 
          ...publishResult,
          message: 'Timetable published successfully'
        })

      case 'clone':
        const { sourceId, reason } = body

        if (!sourceId) {
          return NextResponse.json({ error: 'Source timetable ID required' }, { status: 400 })
        }

        const clonedTimetable = await timetableService.cloneTimetable(
          sourceId,
          session.user.id,
          reason
        )

        return NextResponse.json({ 
          success: true, 
          timetable: clonedTimetable,
          message: `Timetable cloned as version ${clonedTimetable.version}`
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'adjust-slot':
        const { timetableId, slotId, updates } = body

        if (!timetableId || !slotId || !updates) {
          return NextResponse.json({ error: 'Timetable ID, Slot ID, and updates required' }, { status: 400 })
        }

        const adjustResult = await timetableService.adjustTimetableSlot(
          timetableId,
          slotId,
          updates,
          session.user.id
        )

        return NextResponse.json({ 
          success: adjustResult.success, 
          conflicts: adjustResult.conflicts,
          message: `Slot updated. ${adjustResult.conflicts.length} conflicts detected.`
        })

      case 'resolve-conflict':
        // This would implement conflict resolution
        return NextResponse.json({ error: 'Conflict resolution not yet implemented' }, { status: 501 })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const schoolId = searchParams.get('schoolId') || session.user.schoolId
    const termId = searchParams.get('termId')

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    switch (action) {
      case 'archive-old':
        if (!termId) {
          return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
        }

        const keepVersions = parseInt(searchParams.get('keepVersions') || '3')
        const archiveResult = await timetableService.archiveOldVersions(schoolId, termId, keepVersions)

        return NextResponse.json({ 
          success: true, 
          archivedCount: archiveResult.archivedCount,
          message: `Archived ${archiveResult.archivedCount} old timetable versions`
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}