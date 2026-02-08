import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * DoS Assessment Plans API
 * 
 * Provides assessment planning data for DoS monitoring.
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Verify DoS role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        staff: true
      }
    })

    // Check if user has DoS role
    const isDos = user?.roles?.includes('DOS') || user?.role === 'DOS'

    if (!isDos) {
      return NextResponse.json({ message: 'Access denied. DoS role required.' }, { status: 403 })
    }

    const schoolId = user.schoolId
    if (!schoolId) {
      return NextResponse.json({ message: 'School context required' }, { status: 400 })
    }

    // For now, return mock data since we don't have assessment plan tables yet
    // In a real implementation, you would query assessment plan tables
    const mockPlans = [
      {
        id: '1',
        title: 'Mathematics CA1 - Algebra',
        type: 'ca1',
        classId: 'class1',
        className: 'Form 2A',
        subjectId: 'math',
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        teacher: {
          id: 'teacher1',
          name: 'John Smith',
          employeeNumber: 'EMP001'
        },
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        duration: 90,
        totalMarks: 50,
        status: 'planned',
        description: 'First continuous assessment covering algebraic expressions and equations',
        requirements: [
          'Calculator allowed',
          'Graph paper provided',
          'Show all working clearly'
        ],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        title: 'English Literature CA2 - Poetry Analysis',
        type: 'ca2',
        classId: 'class2',
        className: 'Form 4B',
        subjectId: 'eng-lit',
        subjectName: 'English Literature',
        subjectCode: 'ENG-LIT',
        teacher: {
          id: 'teacher2',
          name: 'Sarah Wilson',
          employeeNumber: 'EMP003'
        },
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        duration: 120,
        totalMarks: 75,
        status: 'planned',
        description: 'Analysis of selected poems from the curriculum',
        requirements: [
          'No dictionaries allowed',
          'Answer all questions',
          'Minimum 300 words per essay question'
        ],
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        title: 'Biology Practical - Microscopy',
        type: 'practical',
        classId: 'class3',
        className: 'Form 3A',
        subjectId: 'biology',
        subjectName: 'Biology',
        subjectCode: 'BIO',
        teacher: {
          id: 'teacher3',
          name: 'Mary Johnson',
          employeeNumber: 'EMP002'
        },
        scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (overdue)
        duration: 180,
        totalMarks: 40,
        status: 'planned', // This makes it overdue
        description: 'Practical examination on microscope use and cell observation',
        requirements: [
          'Lab coats mandatory',
          'Handle equipment carefully',
          'Record observations accurately'
        ],
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        title: 'History Term Exam',
        type: 'exam',
        classId: 'class4',
        className: 'Form 5A',
        subjectId: 'history',
        subjectName: 'History',
        subjectCode: 'HIST',
        teacher: {
          id: 'teacher4',
          name: 'David Brown',
          employeeNumber: 'EMP004'
        },
        scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
        duration: 180,
        totalMarks: 100,
        status: 'planned',
        description: 'Comprehensive examination covering World War II and post-war developments',
        requirements: [
          'No reference materials allowed',
          'Answer 4 out of 6 questions',
          'Each question carries equal marks'
        ],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        title: 'Chemistry CA3 - Organic Chemistry',
        type: 'ca3',
        classId: 'class5',
        className: 'Form 4A',
        subjectId: 'chemistry',
        subjectName: 'Chemistry',
        subjectCode: 'CHEM',
        teacher: {
          id: 'teacher5',
          name: 'Lisa Anderson',
          employeeNumber: 'EMP005'
        },
        scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        duration: 90,
        totalMarks: 60,
        status: 'completed',
        description: 'Assessment on organic chemistry reactions and mechanisms',
        requirements: [
          'Periodic table provided',
          'Calculator allowed',
          'Draw structural formulas clearly'
        ],
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '6',
        title: 'Physics Project - Renewable Energy',
        type: 'project',
        classId: 'class6',
        className: 'Form 5B',
        subjectId: 'physics',
        subjectName: 'Physics',
        subjectCode: 'PHY',
        teacher: null, // No teacher assigned
        scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks from now
        duration: 240,
        totalMarks: 80,
        status: 'planned',
        description: 'Group project on renewable energy sources and their applications',
        requirements: [
          'Groups of 3-4 students',
          'Include working model',
          'Presentation required'
        ],
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // Calculate stats
    const now = new Date()
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const stats = {
      totalPlans: mockPlans.length,
      plannedAssessments: mockPlans.filter(p => p.status === 'planned').length,
      activeAssessments: mockPlans.filter(p => p.status === 'active').length,
      completedAssessments: mockPlans.filter(p => p.status === 'completed').length,
      overdueAssessments: mockPlans.filter(p => 
        p.status === 'planned' && new Date(p.scheduledDate) < now
      ).length,
      upcomingThisWeek: mockPlans.filter(p => 
        p.status === 'planned' && 
        new Date(p.scheduledDate) >= now && 
        new Date(p.scheduledDate) <= oneWeekFromNow
      ).length
    }

    return NextResponse.json({
      plans: mockPlans,
      stats
    })

  } catch (error) {
    console.error('Error fetching assessment plans:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}