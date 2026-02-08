import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  layout: z.object({
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    margins: z.object({
      top: z.number().default(20),
      right: z.number().default(20),
      bottom: z.number().default(20),
      left: z.number().default(20)
    })
  }).optional(),
  sections: z.array(z.any()).optional(),
  competencyLevels: z.array(z.any()).optional(),
  gradingScale: z.object({
    continuousAssessment: z.object({
      weight: z.number().default(20),
      maxScore: z.number().default(20)
    }),
    examination: z.object({
      weight: z.number().default(80),
      maxScore: z.number().default(80)
    }),
    finalScore: z.object({
      maxScore: z.number().default(100)
    })
  }).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.reportCardTemplate.findFirst({
      where: {
        id: params.id,
        schoolId: session.user.schoolId
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            reportCards: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching report card template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Check if template exists and belongs to school
    const existingTemplate = await prisma.reportCardTemplate.findFirst({
      where: {
        id: params.id,
        schoolId: session.user.schoolId
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.reportCardTemplate.updateMany({
        where: {
          schoolId: session.user.schoolId,
          isDefault: true,
          id: { not: params.id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.reportCardTemplate.update({
      where: {
        id: params.id
      },
      data: {
        ...validatedData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating report card template:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid template data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if template exists and belongs to school
    const existingTemplate = await prisma.reportCardTemplate.findFirst({
      where: {
        id: params.id,
        schoolId: session.user.schoolId
      },
      include: {
        _count: {
          select: {
            reportCards: true
          }
        }
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prevent deletion if template is in use
    if (existingTemplate._count.reportCards > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is in use by report cards' },
        { status: 400 }
      );
    }

    // Prevent deletion of default template if it's the only one
    if (existingTemplate.isDefault) {
      const templateCount = await prisma.reportCardTemplate.count({
        where: {
          schoolId: session.user.schoolId
        }
      });

      if (templateCount === 1) {
        return NextResponse.json(
          { error: 'Cannot delete the only template' },
          { status: 400 }
        );
      }
    }

    await prisma.reportCardTemplate.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report card template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}