import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await params;
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: session.user.schoolId,
      },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    // Get all subjects for the class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
        schoolId: session.user.schoolId,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Get CA entries
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        termId,
        student: {
          classId,
          schoolId: session.user.schoolId,
        },
      },
      select: {
        studentId: true,
        subjectId: true,
        rawScore: true,
        maxScore: true,
        status: true,
      },
    });

    // Get Exam entries
    const examEntries = await prisma.examEntry.findMany({
      where: {
        termId,
        student: {
          classId,
          schoolId: session.user.schoolId,
        },
      },
      select: {
        studentId: true,
        subjectId: true,
        examScore: true,
        maxScore: true,
        status: true,
      },
    });

    // Get grading system
    const gradingSystem = await prisma.gradingSystem.findFirst({
      where: {
        schoolId: session.user.schoolId,
        category: 'FINAL',
        isDefault: true,
      },
      include: {
        grades: {
          orderBy: {
            minScore: 'desc',
          },
        },
      },
    });

    // Log grading system for debugging
    if (!gradingSystem) {
      console.log('⚠️ No FINAL grading system found for school:', session.user.schoolId);
    } else {
      console.log('✅ Grading system found:', {
        id: gradingSystem.id,
        name: gradingSystem.name,
        gradesCount: gradingSystem.grades.length,
        grades: gradingSystem.grades.map(g => ({
          grade: g.grade,
          min: g.minScore,
          max: g.maxScore
        }))
      });
    }

    // Calculate scores for each student-subject combination
    const studentScores = [];
    const subjectStats = new Map<string, {
      totalStudents: number;
      completedStudents: number;
      caScores: number[];
      examScores: number[];
      finalScores: number[];
      passCount: number;
      dosApproved: boolean;
    }>();

    for (const student of students) {
      for (const classSubject of classSubjects) {
        // Get ALL CA entries for this student-subject combination
        const studentCaEntries = caEntries.filter(
          (ca) => ca.studentId === student.id && ca.subjectId === classSubject.subjectId
        );
        
        const examEntry = examEntries.find(
          (exam) => exam.studentId === student.id && exam.subjectId === classSubject.subjectId
        );

        // Calculate CA contribution (20%)
        // Formula: Average of all CA percentages × 20
        let caScore: number | null = null;
        if (studentCaEntries.length > 0) {
          // Convert each CA entry to percentage
          const caPercentages = studentCaEntries.map(
            (entry) => (entry.rawScore / entry.maxScore) * 100
          );
          
          // Calculate average percentage
          const averagePercentage = 
            caPercentages.reduce((sum, pct) => sum + pct, 0) / caPercentages.length;
          
          // Convert to CA contribution (out of 20)
          caScore = (averagePercentage / 100) * 20;
          caScore = Math.round(caScore * 100) / 100; // Round to 2 decimal places
        }

        // Calculate Exam contribution (80%)
        // Formula: (Exam Score ÷ 100) × 80
        let examScore: number | null = null;
        if (examEntry?.examScore !== null && examEntry?.examScore !== undefined) {
          examScore = (examEntry.examScore / 100) * 80;
          examScore = Math.round(examScore * 100) / 100; // Round to 2 decimal places
        }

        // Calculate final score
        const finalScore = caScore !== null && examScore !== null
          ? caScore + examScore
          : null;

        // Determine grade
        let grade = null;
        if (finalScore !== null && gradingSystem && gradingSystem.grades.length > 0) {
          const gradeRange = gradingSystem.grades.find(
            (g) => finalScore >= g.minScore && finalScore <= g.maxScore
          );
          grade = gradeRange?.grade || null;
          
          // Debug logging for grade calculation
          if (!grade) {
            console.log('⚠️ No grade found for score:', {
              finalScore,
              availableRanges: gradingSystem.grades.map(g => ({
                grade: g.grade,
                min: g.minScore,
                max: g.maxScore
              }))
            });
          }
        } else if (finalScore !== null && !gradingSystem) {
          console.log('⚠️ Cannot calculate grade - no grading system available');
        }

        // Determine status
        let status: 'complete' | 'partial' | 'missing' = 'missing';
        if (caScore !== null && examScore !== null) {
          status = 'complete';
        } else if (caScore !== null || examScore !== null) {
          status = 'partial';
        }

        // Check if both CA and Exam are submitted (not DRAFT)
        const allCaSubmitted = studentCaEntries.length > 0 && 
          studentCaEntries.every(ca => ca.status === 'SUBMITTED' || ca.status === 'APPROVED');
        const examSubmitted = examEntry?.status === 'SUBMITTED' || examEntry?.status === 'APPROVED';
        const bothSubmitted = allCaSubmitted && examSubmitted;

        studentScores.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          subjectId: classSubject.subjectId,
          subjectName: classSubject.subject.name,
          subjectCode: classSubject.subject.code,
          caScore,
          caMaxScore: 20,
          caEntriesCount: studentCaEntries.length,
          examScore,
          examMaxScore: 80,
          finalScore,
          grade,
          status,
          dosApproved: bothSubmitted,
        });

        // Update subject statistics
        if (!subjectStats.has(classSubject.subjectId)) {
          subjectStats.set(classSubject.subjectId, {
            totalStudents: 0,
            completedStudents: 0,
            caScores: [],
            examScores: [],
            finalScores: [],
            passCount: 0,
            dosApproved: true,
          });
        }

        const stats = subjectStats.get(classSubject.subjectId)!;
        stats.totalStudents++;
        if (status === 'complete') {
          stats.completedStudents++;
          if (caScore !== null) stats.caScores.push(caScore);
          if (examScore !== null) stats.examScores.push(examScore);
          if (finalScore !== null) {
            stats.finalScores.push(finalScore);
            if (finalScore >= 50) stats.passCount++;
          }
        }
        // Update subject approval status
        if (!bothSubmitted) {
          stats.dosApproved = false;
        }
      }
    }

    // Calculate subject summaries
    const subjectSummaries = Array.from(subjectStats.entries()).map(([subjectId, stats]) => {
      const subject = classSubjects.find((cs) => cs.subjectId === subjectId)!;
      return {
        subjectId,
        subjectName: subject.subject.name,
        subjectCode: subject.subject.code,
        totalStudents: stats.totalStudents,
        completedStudents: stats.completedStudents,
        averageCA: stats.caScores.length > 0
          ? stats.caScores.reduce((sum, score) => sum + score, 0) / stats.caScores.length
          : 0,
        averageExam: stats.examScores.length > 0
          ? stats.examScores.reduce((sum, score) => sum + score, 0) / stats.examScores.length
          : 0,
        averageFinal: stats.finalScores.length > 0
          ? stats.finalScores.reduce((sum, score) => sum + score, 0) / stats.finalScores.length
          : 0,
        passRate: stats.finalScores.length > 0
          ? (stats.passCount / stats.finalScores.length) * 100
          : 0,
        dosApproved: stats.dosApproved && stats.completedStudents === stats.totalStudents,
      };
    });

    return NextResponse.json({
      success: true,
      studentScores,
      subjectSummaries,
    });
  } catch (error) {
    console.error('Error fetching class scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class scores' },
      { status: 500 }
    );
  }
}
