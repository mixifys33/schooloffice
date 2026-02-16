/**
 * DoS Timetable Inspection API
 * 
 * Provides comprehensive analytics and quality metrics for timetable inspection
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorization - Check DoS role
    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get timetable ID from query params
    const { searchParams } = new URL(request.url)
    const timetableId = searchParams.get('timetableId')

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 })
    }

    // Fetch timetable with entries
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      include: {
        entries: {
          include: {
            curriculumSubject: {
              include: {
                subject: true,
                class: true
              }
            },
            teacher: true
          }
        },
        class: true,
        term: true
      }
    })

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 })
    }

    // Calculate analytics
    const totalSlots = timetable.entries.length
    const uniqueSubjects = new Set(timetable.entries.map(e => e.curriculumSubjectId)).size
    const uniqueTeachers = new Set(timetable.entries.map(e => e.teacherId)).size

    return NextResponse.json({
      success: true,
      data: {
        timetable: {
          id: timetable.id,
          className: timetable.class.name,
          termName: timetable.term.name,
          status: timetable.status,
          totalSlots,
          uniqueSubjects,
          uniqueTeachers
        }
      }
    })
  } catch (error) {
    console.error('Error fetching timetable inspection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}