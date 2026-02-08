import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { 
  SchoolTimeStructure, 
  TimetableGenerationSettings,
  SubjectPeriodRequirement,
  TeacherConstraint
} from '@/types/timetable';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const termId = searchParams.get('termId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const action = searchParams.get('action') || searchParams.get('configType');

    switch (action) {
      case 'time-structure':
        const timeStructure = await prisma.schoolTimeStructure.findFirst({
          where: { schoolId, isActive: true }
        });

        return NextResponse.json({ structure: timeStructure });

      case 'generation-settings':
        const settings = await prisma.timetableGenerationSettings.findUnique({
          where: { schoolId }
        });

        return NextResponse.json({ settings });

      case 'subject-requirements':
        const subjectRequirements = await prisma.subjectPeriodRequirement.findMany({
          where: { schoolId },
          include: {
            subject: true,
            class: true
          }
        });

        return NextResponse.json({ requirements: subjectRequirements });

      case 'teacher-constraints':
        const teacherConstraints = await prisma.teacherConstraint.findMany({
          where: { schoolId },
          include: {
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        });

        return NextResponse.json({ constraints: teacherConstraints });

      case 'all':
        // Get all configuration at once
        const [
          timeStruct,
          genSettings,
          subjReqs,
          teachConst
        ] = await Promise.all([
          prisma.schoolTimeStructure.findFirst({ where: { schoolId, isActive: true } }),
          prisma.timetableGenerationSettings.findUnique({ where: { schoolId } }),
          prisma.subjectPeriodRequirement.findMany({
            where: { schoolId },
            include: { subject: true, class: true }
          }),
          prisma.teacherConstraint.findMany({
            where: { schoolId },
            include: {
              teacher: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          })
        ]);

        return NextResponse.json({
          timeStructure: timeStruct,
          generationSettings: genSettings,
          subjectRequirements: subjReqs,
          teacherConstraints: teachConst
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Timetable config GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can manage timetable configuration'
      }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, configType, ...configData } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    switch (configType) {
      case 'time-structure':
        // Validate required fields
        if (!configData.startTime || !configData.endTime || !configData.periodsPerDay) {
          return NextResponse.json({ error: 'Missing required time structure fields' }, { status: 400 });
        }

        // Update or create time structure
        const updatedTimeStructure = await prisma.schoolTimeStructure.upsert({
          where: { schoolId },
          update: {
            ...configData,
            updatedAt: new Date(),
            updatedBy: session.user.id
          },
          create: {
            ...configData,
            schoolId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: session.user.id
          }
        });

        return NextResponse.json({ 
          success: true, 
          structure: updatedTimeStructure,
          message: 'Time structure updated successfully'
        });

      case 'generation-settings':
        // Validate required fields
        if (typeof configData.hardConstraintWeight !== 'number') {
          return NextResponse.json({ error: 'Missing required generation settings fields' }, { status: 400 });
        }

        // Update or create generation settings
        const updatedSettings = await prisma.timetableGenerationSettings.upsert({
          where: { schoolId },
          update: {
            ...configData,
            updatedAt: new Date(),
            updatedBy: session.user.id
          },
          create: {
            ...configData,
            schoolId,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: session.user.id
          }
        });

        return NextResponse.json({ 
          success: true, 
          settings: updatedSettings,
          message: 'Generation settings updated successfully'
        });

      case 'subject-requirements':
        // Process bulk update of subject requirements
        if (!Array.isArray(configData.requirements)) {
          return NextResponse.json({ error: 'Requirements must be an array' }, { status: 400 });
        }

        // For each requirement, update or create
        const updatedRequirements = [];
        for (const req of configData.requirements) {
          const updatedReq = await prisma.subjectPeriodRequirement.upsert({
            where: {
              schoolId_subjectId_classId: {
                schoolId,
                subjectId: req.subjectId,
                classId: req.classId
              }
            },
            update: {
              ...req,
              updatedAt: new Date()
            },
            create: {
              ...req,
              schoolId,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          updatedRequirements.push(updatedReq);
        }

        return NextResponse.json({ 
          success: true, 
          requirements: updatedRequirements,
          message: `${updatedRequirements.length} subject requirements updated successfully`
        });

      case 'teacher-constraints':
        // Process bulk update of teacher constraints
        if (!Array.isArray(configData.constraints)) {
          return NextResponse.json({ error: 'Constraints must be an array' }, { status: 400 });
        }

        // For each constraint, update or create
        const updatedConstraints = [];
        for (const constraint of configData.constraints) {
          const updatedConstraint = await prisma.teacherConstraint.upsert({
            where: {
              schoolId_teacherId: {
                schoolId,
                teacherId: constraint.teacherId
              }
            },
            update: {
              ...constraint,
              updatedAt: new Date()
            },
            create: {
              ...constraint,
              schoolId,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          updatedConstraints.push(updatedConstraint);
        }

        return NextResponse.json({ 
          success: true, 
          constraints: updatedConstraints,
          message: `${updatedConstraints.length} teacher constraints updated successfully`
        });

      default:
        return NextResponse.json({ error: 'Invalid configuration type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Timetable config POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can manage timetable configuration'
      }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, configType, updates } = body;

    if (!schoolId || !configType || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    switch (configType) {
      case 'activate-time-structure':
        // Deactivate all other time structures for this school
        await prisma.schoolTimeStructure.updateMany({
          where: { schoolId },
          data: { isActive: false }
        });

        // Activate the specified one
        const activatedStructure = await prisma.schoolTimeStructure.update({
          where: { id: updates.id },
          data: { isActive: true }
        });

        return NextResponse.json({ 
          success: true, 
          structure: activatedStructure,
          message: 'Time structure activated successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid configuration type for PUT' }, { status: 400 });
    }
  } catch (error) {
    console.error('Timetable config PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}