import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { dosExamService } from '@/services/dos/dos-exam.service';
import { z } from 'zod';

const createExamSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  examType: z.enum(['MIDTERM', 'FINAL', 'QUIZ', 'PRACTICAL', 'ORAL']),
  termId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  subjects: z.array(z.object({
    subjectId: z.string(),
    totalMarks: z.number().min(1),
    passingMarks: z.number().min(0),
    duration: z.number().min(1), // in minutes
    examDate: z.string().datetime()
  })),
  classes: z.array(z.string()),
  instructions: z.string().optional(),
  isActive: z.boolean().default(true)
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const examType = searchParams.get('examType');
    const classId = searchParams.get('classId');

    const exams = await dosExamService.getExams({
      schoolId: session.user.schoolId,
      termId: termId || undefined,
      examType: examType as any || undefined,
      classId: classId || undefined
    });

    // Transform raw exam data into frontend-expected format
    const now = new Date();
    
    // Calculate overview stats
    const totalExams = exams.length;
    const approvedExams = exams.filter(e => e.dosApproved).length;
    const lockedExams = exams.filter(e => e.isLocked).length;
    
    let totalMarked = 0;
    let totalStudents = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let pastDueCount = 0;

    const examStatus = exams.map(exam => {
      const results = exam.examResults || [];
      const studentsCount = results.length;
      const markedCount = results.filter(r => !r.isAbsent && r.score !== null).length;
      const markingProgress = studentsCount > 0 ? (markedCount / studentsCount) * 100 : 0;
      
      // Calculate average score for this exam
      const scores = results.filter(r => !r.isAbsent && r.score !== null).map(r => r.score!);
      const examAverage = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
      const examAveragePercent = exam.maxScore > 0 ? (examAverage / exam.maxScore) * 100 : 0;

      // Update totals
      totalMarked += markedCount;
      totalStudents += studentsCount;
      totalScore += examAverage * markedCount;
      scoreCount += markedCount;

      // Check if past due (7 days after exam date)
      const dueDate = new Date(exam.examDate);
      dueDate.setDate(dueDate.getDate() + 7);
      const isPastDue = now > dueDate && markingProgress < 100;
      if (isPastDue) pastDueCount++;

      // Check for anomalies (scores > maxScore or unusual patterns)
      const hasAnomalies = results.some(r => r.score && r.score > exam.maxScore);

      return {
        id: exam.id,
        examName: exam.examName,
        subjectName: exam.curriculumSubject.subject.name,
        className: exam.curriculumSubject.class.name,
        teacherName: 'N/A', // TODO: Get from teacher assignment
        examType: exam.examType,
        totalMarks: exam.maxScore,
        examDate: exam.examDate.toISOString(),
        isLocked: exam.isLocked || false,
        dosApproved: exam.dosApproved || false,
        studentsCount,
        markedCount,
        markingProgress,
        averageScore: examAveragePercent,
        isPastDue,
        hasAnomalies,
        canApprove: markingProgress >= 80 && !exam.dosApproved,
        canLock: exam.dosApproved && markingProgress >= 100 && !exam.isLocked
      };
    });

    const markingProgress = totalStudents > 0 ? (totalMarked / totalStudents) * 100 : 0;
    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

    // Generate critical issues
    const criticalIssues = [];
    
    if (pastDueCount > 0) {
      criticalIssues.push({
        id: 'past-due',
        title: 'Overdue Marking',
        description: `${pastDueCount} exam(s) have passed their marking deadline`,
        severity: 'HIGH' as const,
        affectedClasses: pastDueCount,
        actionUrl: '/dos/exams?filter=overdue'
      });
    }

    const unapprovedCount = totalExams - approvedExams;
    if (unapprovedCount > 0) {
      criticalIssues.push({
        id: 'unapproved',
        title: 'Pending Approval',
        description: `${unapprovedCount} exam(s) require DoS approval`,
        severity: 'MEDIUM' as const,
        affectedClasses: unapprovedCount,
        actionUrl: '/dos/exams?filter=pending'
      });
    }

    const unlockedCount = totalExams - lockedExams;
    if (unlockedCount > 0 && approvedExams === totalExams) {
      criticalIssues.push({
        id: 'unlocked',
        title: 'Unlocked Exams',
        description: `${unlockedCount} approved exam(s) are not locked yet`,
        severity: 'LOW' as const,
        affectedClasses: unlockedCount,
        actionUrl: '/dos/exams?filter=approved'
      });
    }

    // System status (simplified - can be enhanced with actual term dates)
    const systemStatus = {
      examPeriodActive: exams.some(e => {
        const examDate = new Date(e.examDate);
        const weekBefore = new Date(examDate);
        weekBefore.setDate(weekBefore.getDate() - 7);
        const weekAfter = new Date(examDate);
        weekAfter.setDate(weekAfter.getDate() + 7);
        return now >= weekBefore && now <= weekAfter;
      }),
      markingOpen: true // Can be enhanced with actual marking period logic
    };

    const data = {
      overview: {
        totalExams,
        approvedExams,
        lockedExams,
        markingProgress,
        averageScore,
        pastDueExams: pastDueCount
      },
      examStatus,
      criticalIssues,
      systemStatus
    };

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createExamSchema.parse(body);

    const exam = await dosExamService.createExam({
      ...validatedData,
      schoolId: session.user.schoolId,
      createdBy: session.user.id
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}