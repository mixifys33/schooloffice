import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * DoS Assessment Performance API
 * 
 * Provides performance analytics for DoS monitoring.
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

    // For now, return mock data since we need complex performance calculations
    // In a real implementation, you would query marks and calculate performance metrics
    const mockPerformanceData = [
      {
        classId: 'class1',
        className: 'Form 2A',
        subjects: [
          {
            subjectId: 'math',
            subjectName: 'Mathematics',
            subjectCode: 'MATH',
            teacher: {
              id: 'teacher1',
              name: 'John Smith',
              employeeNumber: 'EMP001'
            },
            assessments: [
              {
                type: 'CA1',
                averageScore: 72.5,
                highestScore: 95,
                lowestScore: 45,
                passRate: 85.7,
                totalStudents: 35,
                completedStudents: 35,
                trend: 'improving',
                lastAssessment: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                type: 'CA2',
                averageScore: 68.3,
                highestScore: 92,
                lowestScore: 38,
                passRate: 80.0,
                totalStudents: 35,
                completedStudents: 35,
                trend: 'stable',
                lastAssessment: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            overallAverage: 70.4,
            overallPassRate: 82.9,
            trend: 'improving'
          },
          {
            subjectId: 'english',
            subjectName: 'English Language',
            subjectCode: 'ENG',
            teacher: {
              id: 'teacher2',
              name: 'Sarah Wilson',
              employeeNumber: 'EMP003'
            },
            assessments: [
              {
                type: 'CA1',
                averageScore: 65.2,
                highestScore: 88,
                lowestScore: 42,
                passRate: 74.3,
                totalStudents: 35,
                completedStudents: 35,
                trend: 'stable',
                lastAssessment: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                type: 'CA2',
                averageScore: 58.7,
                highestScore: 85,
                lowestScore: 35,
                passRate: 68.6,
                totalStudents: 35,
                completedStudents: 35,
                trend: 'declining',
                lastAssessment: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            overallAverage: 62.0,
            overallPassRate: 71.4,
            trend: 'declining'
          }
        ],
        classAverage: 66.2,
        classPassRate: 77.1,
        classTrend: 'stable'
      },
      {
        classId: 'class2',
        className: 'Form 3B',
        subjects: [
          {
            subjectId: 'biology',
            subjectName: 'Biology',
            subjectCode: 'BIO',
            teacher: {
              id: 'teacher3',
              name: 'Mary Johnson',
              employeeNumber: 'EMP002'
            },
            assessments: [
              {
                type: 'CA1',
                averageScore: 78.9,
                highestScore: 96,
                lowestScore: 55,
                passRate: 91.2,
                totalStudents: 34,
                completedStudents: 34,
                trend: 'improving',
                lastAssessment: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                type: 'CA2',
                averageScore: 82.1,
                highestScore: 98,
                lowestScore: 62,
                passRate: 94.1,
                totalStudents: 34,
                completedStudents: 34,
                trend: 'improving',
                lastAssessment: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                type: 'Practical',
                averageScore: 85.3,
                highestScore: 100,
                lowestScore: 68,
                passRate: 97.1,
                totalStudents: 34,
                completedStudents: 34,
                trend: 'improving',
                lastAssessment: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            overallAverage: 82.1,
            overallPassRate: 94.1,
            trend: 'improving'
          },
          {
            subjectId: 'chemistry',
            subjectName: 'Chemistry',
            subjectCode: 'CHEM',
            teacher: {
              id: 'teacher4',
              name: 'Lisa Anderson',
              employeeNumber: 'EMP005'
            },
            assessments: [
              {
                type: 'CA1',
                averageScore: 71.4,
                highestScore: 89,
                lowestScore: 48,
                passRate: 82.4,
                totalStudents: 34,
                completedStudents: 34,
                trend: 'stable',
                lastAssessment: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                type: 'CA2',
                averageScore: 69.8,
                highestScore: 91,
                lowestScore: 44,
                passRate: 79.4,
                totalStudents: 34,
                completedStudents: 34,
                trend: 'declining',
                lastAssessment: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            overallAverage: 70.6,
            overallPassRate: 80.9,
            trend: 'declining'
          }
        ],
        classAverage: 76.4,
        classPassRate: 87.5,
        classTrend: 'improving'
      },
      {
        classId: 'class3',
        className: 'Form 4A',
        subjects: [
          {
            subjectId: 'physics',
            subjectName: 'Physics',
            subjectCode: 'PHY',
            teacher: null, // No teacher assigned
            assessments: [],
            overallAverage: 0,
            overallPassRate: 0,
            trend: 'stable'
          },
          {
            subjectId: 'history',
            subjectName: 'History',
            subjectCode: 'HIST',
            teacher: {
              id: 'teacher5',
              name: 'David Brown',
              employeeNumber: 'EMP004'
            },
            assessments: [
              {
                type: 'CA1',
                averageScore: 45.2,
                highestScore: 78,
                lowestScore: 22,
                passRate: 42.9,
                totalStudents: 28,
                completedStudents: 28,
                trend: 'declining',
                lastAssessment: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                type: 'CA2',
                averageScore: 38.7,
                highestScore: 72,
                lowestScore: 18,
                passRate: 32.1,
                totalStudents: 28,
                completedStudents: 28,
                trend: 'declining',
                lastAssessment: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            overallAverage: 42.0,
            overallPassRate: 37.5,
            trend: 'declining'
          }
        ],
        classAverage: 21.0, // Low due to missing physics scores
        classPassRate: 18.8,
        classTrend: 'declining'
      }
    ]

    // Calculate overall stats
    const allSubjects = mockPerformanceData.flatMap(c => c.subjects).filter(s => s.teacher !== null)
    const allClassAverages = mockPerformanceData.map(c => c.classAverage).filter(avg => avg > 0)
    
    const stats = {
      totalClasses: mockPerformanceData.length,
      totalSubjects: allSubjects.length,
      overallAverage: allSubjects.length > 0 
        ? allSubjects.reduce((sum, s) => sum + s.overallAverage, 0) / allSubjects.length
        : 0,
      overallPassRate: allSubjects.length > 0 
        ? allSubjects.reduce((sum, s) => sum + s.overallPassRate, 0) / allSubjects.length
        : 0,
      improvingSubjects: allSubjects.filter(s => s.trend === 'improving').length,
      decliningSubjects: allSubjects.filter(s => s.trend === 'declining').length,
      criticalSubjects: allSubjects.filter(s => s.overallAverage < 40).length,
      topPerformingClass: mockPerformanceData.reduce((top, current) => 
        current.classAverage > (top?.classAverage || 0) ? current : top, 
        mockPerformanceData[0]
      )?.className || '',
      lowestPerformingClass: mockPerformanceData.reduce((lowest, current) => 
        current.classAverage < (lowest?.classAverage || 100) && current.classAverage > 0 ? current : lowest, 
        mockPerformanceData[0]
      )?.className || ''
    }

    return NextResponse.json({
      performanceData: mockPerformanceData,
      stats
    })

  } catch (error) {
    console.error('Error fetching assessment performance:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}