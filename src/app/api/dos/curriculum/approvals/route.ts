import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * DoS Curriculum Approvals API
 * 
 * Manages curriculum approval requests for DoS review.
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

    // For now, return mock data since we don't have approval tables yet
    // In a real implementation, you would query approval tables
    const mockApprovals = [
      {
        id: '1',
        type: 'lesson_plan',
        title: 'Mathematics Lesson Plan - Quadratic Equations',
        description: 'Comprehensive lesson plan for teaching quadratic equations to Form 2 students',
        submittedBy: {
          id: 'teacher1',
          name: 'John Smith',
          employeeNumber: 'EMP001',
          role: 'Mathematics Teacher'
        },
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        status: 'pending',
        priority: 'medium',
        affectedClasses: ['Form 2A', 'Form 2B'],
        affectedSubjects: ['Mathematics'],
        documents: [
          {
            id: 'doc1',
            name: 'Quadratic_Equations_Lesson_Plan.pdf',
            url: '/documents/lesson-plans/quadratic-equations.pdf',
            type: 'pdf'
          }
        ],
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
      },
      {
        id: '2',
        type: 'curriculum_change',
        title: 'Science Curriculum Update - Climate Change Module',
        description: 'Addition of climate change awareness module to Form 3 Science curriculum',
        submittedBy: {
          id: 'teacher2',
          name: 'Mary Johnson',
          employeeNumber: 'EMP002',
          role: 'Science Teacher'
        },
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        status: 'pending',
        priority: 'high',
        affectedClasses: ['Form 3A', 'Form 3B', 'Form 3C'],
        affectedSubjects: ['Biology', 'Chemistry', 'Physics'],
        documents: [
          {
            id: 'doc2',
            name: 'Climate_Change_Module.pdf',
            url: '/documents/curriculum/climate-change-module.pdf',
            type: 'pdf'
          },
          {
            id: 'doc3',
            name: 'Assessment_Rubric.docx',
            url: '/documents/curriculum/climate-assessment.docx',
            type: 'docx'
          }
        ],
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day from now
      },
      {
        id: '3',
        type: 'assessment_plan',
        title: 'English Literature CA3 Assessment Plan',
        description: 'Continuous assessment plan for English Literature focusing on poetry analysis',
        submittedBy: {
          id: 'teacher3',
          name: 'Sarah Wilson',
          employeeNumber: 'EMP003',
          role: 'English Teacher'
        },
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: 'approved',
        priority: 'medium',
        affectedClasses: ['Form 4A', 'Form 4B'],
        affectedSubjects: ['English Literature'],
        documents: [
          {
            id: 'doc4',
            name: 'Poetry_Analysis_Assessment.pdf',
            url: '/documents/assessments/poetry-analysis.pdf',
            type: 'pdf'
          }
        ],
        reviewNotes: 'Approved with minor modifications to marking scheme.',
        reviewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        id: '4',
        type: 'subject_outline',
        title: 'Computer Science Subject Outline Update',
        description: 'Updated subject outline to include Python programming and data structures',
        submittedBy: {
          id: 'teacher4',
          name: 'David Brown',
          employeeNumber: 'EMP004',
          role: 'Computer Science Teacher'
        },
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        status: 'needs_revision',
        priority: 'low',
        affectedClasses: ['Form 5A', 'Form 5B'],
        affectedSubjects: ['Computer Science'],
        documents: [
          {
            id: 'doc5',
            name: 'CS_Subject_Outline_2024.pdf',
            url: '/documents/outlines/cs-outline-2024.pdf',
            type: 'pdf'
          }
        ],
        reviewNotes: 'Please provide more detailed assessment criteria for practical programming tasks.',
        reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      }
    ]

    // Calculate stats
    const stats = {
      totalPending: mockApprovals.filter(a => a.status === 'pending').length,
      totalApproved: mockApprovals.filter(a => a.status === 'approved').length,
      totalRejected: mockApprovals.filter(a => a.status === 'rejected').length,
      needsRevision: mockApprovals.filter(a => a.status === 'needs_revision').length,
      overdue: mockApprovals.filter(a => 
        a.status === 'pending' && a.dueDate && new Date(a.dueDate) < new Date()
      ).length,
      urgent: mockApprovals.filter(a => a.priority === 'urgent').length
    }

    return NextResponse.json({
      approvals: mockApprovals,
      stats
    })

  } catch (error) {
    console.error('Error fetching curriculum approvals:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}