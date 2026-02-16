import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    // If no classId, return list of classes
    if (!classId) {
      const classes = await prisma.class.findMany({
        where: { schoolId: session.user.schoolId },
        select: {
          id: true,
          name: true,
          level: true
        },
        orderBy: { level: 'asc' }
      });

      return NextResponse.json({
        success: true,
        data: { classes }
      });
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isCurrent: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!currentTerm) {
      return NextResponse.json({
        success: false,
        error: 'No active term found'
      }, { status: 404 });
    }

    // Get class details
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        level: true
      }
    });

    if (!classData) {
      return NextResponse.json({
        success: false,
        error: 'Class not found'
      }, { status: 404 });
    }

    // Get all subjects for this class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Get all students in this class
    const students = await prisma.student.findMany({
      where: { classId, schoolId: session.user.schoolId },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        stream: {
          select: {
            name: true
          }
        }
      },
      orderBy: { admissionNumber: 'asc' }
    });

    // Get all exam entries for this term and class
    const examEntries = await prisma.examEntry.findMany({
      where: {
        termId: currentTerm.id,
        student: { classId }
      },
      select: {
        studentId: true,
        subjectId: true,
        examScore: true,
        maxScore: true
      }
    });

    // Get all CA entries for this term and class
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        termId: currentTerm.id,
        student: { classId }
      },
      select: {
        studentId: true,
        subjectId: true,
        rawScore: true,
        maxScore: true
      }
    });

    // Build subject columns
    const subjectColumns = classSubjects.map(cs => ({
      subjectId: cs.subject.id,
      subjectCode: cs.subject.code,
      subjectName: cs.subject.name
    }));

    // Build student rows with scores
    const studentRows = students.map(student => {
      const subjectScores: Record<string, {
        examScore: number | null;
        caScore: number | null;
        finalScore: number | null;
      }> = {};

      classSubjects.forEach(cs => {
        // Get exam score (convert to /80)
        const examEntry = examEntries.find(
          e => e.studentId === student.id && e.subjectId === cs.subject.id
        );
        const examScore = examEntry && examEntry.examScore !== null
          ? (examEntry.examScore / examEntry.maxScore) * 80
          : null;

        // Get CA average (convert to /20)
        const studentCAEntries = caEntries.filter(
          e => e.studentId === student.id && e.subjectId === cs.subject.id
        );
        let caScore: number | null = null;
        if (studentCAEntries.length > 0) {
          const caSum = studentCAEntries.reduce((sum, entry) => {
            if (entry.rawScore !== null) {
              return sum + (entry.rawScore / entry.maxScore) * 100;
            }
            return sum;
          }, 0);
          const caAverage = caSum / studentCAEntries.length;
          caScore = (caAverage / 100) * 20;
        }

        // Calculate final score (exam + ca)
        const finalScore = (examScore !== null && caScore !== null)
          ? examScore + caScore
          : null;

        subjectScores[cs.subject.code] = {
          examScore,
          caScore,
          finalScore
        };
      });

      // Calculate overall average (across all subjects)
      // IMPORTANT: Include ALL subjects in the class, treating null/missing scores as 0
      // Formula: (sum of all final scores) / (total number of subjects)
      const allFinalScores = Object.values(subjectScores).map(s => s.finalScore ?? 0);
      const overallAverage = classSubjects.length > 0
        ? allFinalScores.reduce((sum, score) => sum + score, 0) / classSubjects.length
        : null;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        stream: student.stream?.name || null,
        subjectScores,
        overallAverage
      };
    });

    // Calculate summary stats
    const studentsWithExamScores = studentRows.filter(s =>
      Object.values(s.subjectScores).some(scores => scores.examScore !== null)
    ).length;

    const studentsWithCAScores = studentRows.filter(s =>
      Object.values(s.subjectScores).some(scores => scores.caScore !== null)
    ).length;

    const studentsWithFinalScores = studentRows.filter(s =>
      Object.values(s.subjectScores).some(scores => scores.finalScore !== null)
    ).length;

    const data = {
      class: classData,
      term: currentTerm,
      subjectColumns,
      studentRows,
      summary: {
        totalStudents: students.length,
        totalSubjects: classSubjects.length,
        studentsWithExamScores,
        studentsWithCAScores,
        studentsWithFinalScores
      }
    };

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching exam summary:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
