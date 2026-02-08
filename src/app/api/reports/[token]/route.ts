// src/app/api/reports/[token]/route.ts
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Retrieve report data by secure token
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the secure link by token
    const secureLink = await prisma.secureLink.findUnique({
      where: { token },
      include: {
        guardian: true // Assuming this relates to a guardian
      }
    });

    if (!secureLink) {
      return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if the link has expired
    if (secureLink.expiresAt && new Date() > new Date(secureLink.expiresAt)) {
      return new Response(JSON.stringify({ error: 'This report link has expired. Contact school.' }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if the link has been revoked
    if (secureLink.revokedAt) {
      return new Response(JSON.stringify({ error: 'This report link has been revoked. Contact school.' }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Increment view count
    await prisma.secureLink.update({
      where: { token },
      data: {
        currentViews: { increment: 1 },
        lastAccessAt: new Date()
      }
    });

    // Get the report card data based on the resource ID
    if (secureLink.resourceType === 'REPORT_CARD') {
      const reportCard = await prisma.newCurriculumReportCard.findUnique({
        where: { id: secureLink.resourceId },
        include: {
          student: {
            include: {
              class: true,
              school: true
            }
          },
          term: {
            include: {
              academicYear: true
            }
          },
          reportCardSubjects: {
            include: {
              subject: true,
              teacher: true
            }
          }
        }
      });

      if (!reportCard) {
        return new Response(JSON.stringify({ error: 'Report card not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Transform the data to match the StudentReportCard interface
      const transformedData = {
        id: reportCard.id,
        studentId: reportCard.studentId,
        studentName: `${reportCard.student.firstName} ${reportCard.student.lastName}`,
        admissionNumber: reportCard.student.admissionNumber,
        classId: reportCard.student.classId,
        className: reportCard.student.class.name,
        termId: reportCard.termId,
        termName: reportCard.term.name,
        academicYear: reportCard.term.academicYear.name,
        subjectResults: reportCard.reportCardSubjects.map(rcs => ({
          subjectId: rcs.subjectId,
          subjectName: rcs.subject.name,
          subjectCode: rcs.subject.code,
          caScore: rcs.caScore,
          examScore: rcs.examScore,
          finalScore: rcs.finalScore,
          grade: rcs.grade,
          gradeDescriptor: rcs.descriptor || null,
          teacherRemarks: rcs.remarks || null,
          dosRemarks: null,
          approved: true, // Since this is a published report
          locked: true   // Since this is a published report
        })),
        overallAverage: reportCard.overallAverage,
        overallGrade: reportCard.overallGrade,
        position: reportCard.position,
        totalStudents: reportCard.totalStudents,
        classTeacherRemarks: reportCard.classTeacherRemarks,
        dosRemarks: reportCard.dosRemarks,
        state: reportCard.status as 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED',
        publishedAt: reportCard.publishedAt || undefined,
        publishedBy: reportCard.publishedBy || undefined,
        linkToken: token,
        linkExpiry: secureLink.expiresAt,
        pdfUrl: reportCard.pdfUrl || undefined,
        createdAt: reportCard.createdAt,
        updatedAt: reportCard.updatedAt,
        schoolName: reportCard.student.school?.name || 'School Name',
        reportDate: reportCard.createdAt.toISOString()
      };

      // Return the transformed report data
      return new Response(JSON.stringify(transformedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported resource type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error retrieving report:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}