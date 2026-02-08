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

    return NextResponse.json({ exams });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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