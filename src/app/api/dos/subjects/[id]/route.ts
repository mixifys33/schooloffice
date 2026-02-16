/**
 * DoS Individual Subject API Route
 * Handles CRUD operations for individual subjects
 * Updated: 2026-02-14
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET individual subject for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subjectId } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Get subject with all related data
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
      },
      include: {
        classSubjects: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        staffSubjects: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        dosCurriculumSubjects: {
          include: {
            class: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Get curriculum data if exists
    const curriculumData = subject.dosCurriculumSubjects[0];

    const subjectData = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      educationLevel: subject.educationLevel,
      isActive: subject.isActive,
      description: `${subject.name} curriculum subject`,
      curriculumData: curriculumData ? {
        isCore: curriculumData.isCore,
        caWeight: curriculumData.caWeight,
        examWeight: curriculumData.examWeight,
        minPassMark: curriculumData.minPassMark,
        periodsPerWeek: curriculumData.periodsPerWeek,
        dosApproved: curriculumData.dosApproved,
      } : null,
      classAssignments: subject.classSubjects.map(cs => ({
        classId: cs.classId,
        className: cs.class.name,
        maxMark: cs.maxMark,
        appearsOnReport: cs.appearsOnReport,
        affectsPosition: cs.affectsPosition,
      })),
      teacherAssignments: subject.staffSubjects.map(ss => ({
        staffId: ss.staffId,
        staffName: `${ss.staff.firstName} ${ss.staff.lastName}`,
        classId: ss.classId,
        isPrimary: ss.isPrimary,
      }))
    };

    return NextResponse.json({
      subject: subjectData
    });

  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject' },
      { status: 500 }
    );
  }
}

// PUT update subject
// PUT - Update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subjectId } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Verify subject exists and belongs to school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
      }
    });

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Check for duplicate code if code is being changed
    if (data.code !== existingSubject.code) {
      const duplicateCode = await prisma.subject.findFirst({
        where: {
          schoolId,
          code: data.code,
          id: { not: subjectId }
        }
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: `Subject code ${data.code} already exists` },
          { status: 400 }
        );
      }
    }

    // Update subject
    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name,
        code: data.code,
        educationLevel: data.educationLevel,
        isActive: data.isActive,
      }
    });

    // Update curriculum data if provided
    if (data.curriculumData) {
      await prisma.doSCurriculumSubject.upsert({
        where: {
          subjectId_classId: {
            subjectId: subjectId,
            classId: data.curriculumData.classId || 'default', // This needs proper class handling
          }
        },
        update: {
          isCore: data.curriculumData.isCore,
          caWeight: data.curriculumData.caWeight,
          examWeight: data.curriculumData.examWeight,
          minPassMark: data.curriculumData.minPassMark,
          periodsPerWeek: data.curriculumData.periodsPerWeek,
          dosApproved: false, // Reset approval when changes are made
        },
        create: {
          schoolId,
          subjectId,
          classId: data.curriculumData.classId || 'default',
          isCore: data.curriculumData.isCore,
          caWeight: data.curriculumData.caWeight,
          examWeight: data.curriculumData.examWeight,
          minPassMark: data.curriculumData.minPassMark,
          periodsPerWeek: data.curriculumData.periodsPerWeek,
          dosApproved: false,
        }
      });
    }

    return NextResponse.json({
      success: true,
      subject: updatedSubject
    });

  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' },
      { status: 500 }
    );
  }
}

// DELETE subject
// DELETE - Remove subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subjectId } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Verify subject exists and belongs to school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
      }
    });

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Check if subject has marks - if so, only deactivate
    const hasMarks = await prisma.mark.findFirst({
      where: { subjectId }
    });

    if (hasMarks) {
      // Soft delete - deactivate only
      await prisma.subject.update({
        where: { id: subjectId },
        data: { isActive: false }
      });

      return NextResponse.json({
        success: true,
        message: 'Subject deactivated (has existing marks)'
      });
    } else {
      // Hard delete - remove completely
      await prisma.subject.delete({
        where: { id: subjectId }
      });

      return NextResponse.json({
        success: true,
        message: 'Subject deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}