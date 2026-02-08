import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TimetableStatus } from '@/types/timetable';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can publish timetables'
      }, { status: 403 });
    }

    const timetableId = params.id;
    const body = await request.json();
    const { notifyTeachers, notifyStudents, generatePDFs, publishToPortals } = body;

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 });
    }

    // Get the timetable to verify it belongs to the user's school and is approved
    const timetable = await prisma.timetableDraft.findUnique({
      where: { id: timetableId },
      include: {
        school: true,
        term: true,
        slots: {
          include: {
            class: true,
            subject: true,
            teacher: true,
            room: true
          }
        }
      }
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    if (timetable.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if timetable is approved before publishing
    if (timetable.status !== TimetableStatus.APPROVED) {
      return NextResponse.json({
        error: 'Timetable must be approved before publishing',
        status: timetable.status
      }, { status: 400 });
    }

    // Update timetable status to PUBLISHED
    const updatedTimetable = await prisma.timetableDraft.update({
      where: { id: timetableId },
      data: {
        status: TimetableStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });

    // Log the publication action
    await prisma.auditLog.create({
      data: {
        schoolId: timetable.schoolId,
        userId: session.user.id,
        action: 'TIMETABLE_PUBLISHED',
        entityType: 'TIMETABLE_DRAFT',
        entityId: timetableId,
        details: {
          action: 'PUBLISHED',
          publishedBy: session.user.id,
          notifyTeachers: notifyTeachers || false,
          notifyStudents: notifyStudents || false
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Log publication in publication log
    await prisma.timetablePublicationLog.create({
      data: {
        schoolId: timetable.schoolId,
        timetableId,
        action: 'PUBLISHED',
        performedBy: session.user.id,
        notificationsSent: (notifyTeachers || notifyStudents) || false,
        notificationCount: 0, // This would be calculated based on recipients
        performedAt: new Date()
      }
    });

    // TODO: Implement notification sending
    if (notifyTeachers || notifyStudents) {
      // This would trigger sending notifications to teachers and/or students
      // Implementation would depend on the notification system in place
      console.log(`Notifications would be sent for timetable ${timetableId}`);
    }

    // TODO: Generate PDFs if requested
    if (generatePDFs) {
      // This would trigger PDF generation for various views (class, teacher, master)
      console.log(`PDFs would be generated for timetable ${timetableId}`);
    }

    // TODO: Publish to portals if requested
    if (publishToPortals) {
      // This would make the timetable accessible through student/parent/teacher portals
      console.log(`Timetable would be published to portals ${timetableId}`);
    }

    return NextResponse.json({
      success: true,
      timetable: updatedTimetable,
      message: 'Timetable published successfully'
    });
  } catch (error) {
    console.error('Timetable publishing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can unpublish timetables'
      }, { status: 403 });
    }

    const timetableId = params.id;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason');

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 });
    }

    // Get the timetable to verify it belongs to the user's school and is published
    const timetable = await prisma.timetableDraft.findUnique({
      where: { id: timetableId },
      include: { school: true }
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    if (timetable.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if timetable is published before unpublishing
    if (timetable.status !== TimetableStatus.PUBLISHED) {
      return NextResponse.json({
        error: 'Timetable must be published to be unpublished',
        status: timetable.status
      }, { status: 400 });
    }

    // Update timetable status back to APPROVED
    const updatedTimetable = await prisma.timetableDraft.update({
      where: { id: timetableId },
      data: {
        status: TimetableStatus.APPROVED,
        publishedAt: null
      }
    });

    // Log the unpublication action
    await prisma.auditLog.create({
      data: {
        schoolId: timetable.schoolId,
        userId: session.user.id,
        action: 'TIMETABLE_UNPUBLISHED',
        entityType: 'TIMETABLE_DRAFT',
        entityId: timetableId,
        details: {
          action: 'UNPUBLISHED',
          unpublishedBy: session.user.id,
          reason: reason || 'No reason provided'
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Log unpublication in publication log
    await prisma.timetablePublicationLog.create({
      data: {
        schoolId: timetable.schoolId,
        timetableId,
        action: 'UNPUBLISHED',
        performedBy: session.user.id,
        reason: reason || 'No reason provided',
        performedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      timetable: updatedTimetable,
      message: 'Timetable unpublished successfully'
    });
  } catch (error) {
    console.error('Timetable unpublishing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}