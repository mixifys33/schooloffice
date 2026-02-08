import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const templateFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'number', 'select', 'textarea', 'image', 'table']),
  label: z.string(),
  required: z.boolean().default(false),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  options: z.array(z.string()).optional(),
  defaultValue: z.any().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional()
  }).optional()
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  layout: z.object({
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    margins: z.object({
      top: z.number().default(20),
      right: z.number().default(20),
      bottom: z.number().default(20),
      left: z.number().default(20)
    })
  }),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['header', 'student_info', 'subjects', 'skills', 'remarks', 'promotion', 'validation']),
    visible: z.boolean().default(true),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number()
    }),
    fields: z.array(templateFieldSchema)
  })),
  competencyLevels: z.array(z.object({
    level: z.string(),
    descriptor: z.string(),
    minScore: z.number(),
    maxScore: z.number(),
    color: z.string().optional()
  })),
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
  })
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.reportCardTemplate.findMany({
      where: {
        schoolId: session.user.schoolId
      },
      include: {
        _count: {
          select: {
            reportCards: true
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching report card templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.reportCardTemplate.updateMany({
        where: {
          schoolId: session.user.schoolId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.reportCardTemplate.create({
      data: {
        ...validatedData,
        schoolId: session.user.schoolId,
        createdById: session.user.id
      }
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating report card template:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid template data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}