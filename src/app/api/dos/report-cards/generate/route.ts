import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateNewCurriculumReportCard } from '@/services/pdf-generation.service';
import { z } from 'zod';

const generateReportCardSchema = z.object({
  studentId: z.string(),
  termId: z.string(),
  templateId: z.string().optional(),
  format: z.enum(['pdf', 'preview']).default('pdf'),
  customData: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, termId, templateId, format, customData } = generateReportCardSchema.parse(body);

    // Get student data
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: session.user.schoolId
      },
      include: {
        class: {
          include: {
            stream: true
          }
        },
        guardians: {
          include: {
            guardian: true
          }
        },
        profileImage: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get term data
    const term = await prisma.term.findFirst({
      where: {
        id: termId,
        schoolId: session.user.schoolId
      }
    });

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Get or use default template
    let template;
    if (templateId) {
      template = await prisma.reportCardTemplate.findFirst({
        where: {
          id: templateId,
          schoolId: session.user.schoolId
        }
      });
    } else {
      template = await prisma.reportCardTemplate.findFirst({
        where: {
          schoolId: session.user.schoolId,
          isDefault: true
        }
      });
    }

    if (!template) {
      return NextResponse.json({ error: 'No template found' }, { status: 404 });
    }

    // Get academic data (subjects, scores, attendance, etc.)
    const academicData = await getStudentAcademicData(studentId, termId, session.user.schoolId);

    // Generate the report card
    const reportCardData = {
      student,
      term,
      template,
      academicData,
      customData: customData || {}
    };

    if (format === 'preview') {
      // Return preview data without generating PDF
      return NextResponse.json({
        preview: true,
        data: reportCardData
      });
    }

    // Generate PDF
    const pdfBuffer = await generateNewCurriculumReportCard(reportCardData);

    // Save report card record
    const reportCard = await prisma.reportCard.create({
      data: {
        studentId,
        termId,
        templateId: template.id,
        schoolId: session.user.schoolId,
        generatedById: session.user.id,
        data: reportCardData,
        status: 'GENERATED'
      }
    });

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-card-${student.firstName}-${student.lastName}-${term.name}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generating report card:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate report card' },
      { status: 500 }
    );
  }
}

async function getStudentAcademicData(studentId: string, termId: string, schoolId: string) {
  // Get attendance data
  const attendance = await prisma.attendance.findMany({
    where: {
      studentId,
      term: { id: termId },
      schoolId
    }
  });

  // Get subject scores and assessments
  const subjectScores = await prisma.dosReportCard.findMany({
    where: {
      studentId,
      termId,
      schoolId
    },
    include: {
      subject: true,
      competencies: true
    }
  });

  // Get behavioral assessments
  const behavioralAssessments = await prisma.behavioralAssessment.findMany({
    where: {
      studentId,
      termId,
      schoolId
    }
  });

  // Calculate attendance summary
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
  const absentDays = totalDays - presentDays;

  return {
    attendance: {
      totalDays,
      presentDays,
      absentDays,
      percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
    },
    subjects: subjectScores,
    behavioral: behavioralAssessments
  };
}