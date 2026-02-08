import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { dosAssessmentService } from '@/services/dos/dos-assessment.service';
import { z } from 'zod';

const createAssessmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subjectId: z.string(),
  classId: z.string(),
  termId: z.string(),
  assessmentType: z.enum(['QUIZ', 'TEST', 'ASSIGNMENT', 'PROJECT', 'PRACTICAL']),
  totalMarks: z.number().min(1),
  passingMarks: z.number().min(0),
  dueDate: z.string().datetime(),
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
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const termId = searchParams.get('termId');
    const type = searchParams.get('type');

    const assessments = await dosAssessmentService.getAssessments({
      schoolId: session.user.schoolId,
      classId: classId || undefined,
      subjectId: subjectId || undefined,
      termId: termId || undefined,
      type: type as any || undefined
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Error fetching assessments:', error);
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
    const validatedData = createAssessmentSchema.parse(body);

    const assessment = await dosAssessmentService.createAssessment({
      ...validatedData,
      schoolId: session.user.schoolId,
      createdBy: session.user.id
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error creating assessment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}