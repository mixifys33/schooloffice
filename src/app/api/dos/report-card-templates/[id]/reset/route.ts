import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getDefaultReportCardTemplate } from '@/services/pdf-generation.service';

export async function POST(
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
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get the default template structure
    const defaultTemplate = getDefaultReportCardTemplate();

    // Reset the template to default values
    const template = await prisma.reportCardTemplate.update({
      where: {
        id: params.id
      },
      data: {
        layout: defaultTemplate.layout,
        sections: defaultTemplate.sections,
        competencyLevels: defaultTemplate.competencyLevels,
        gradingScale: defaultTemplate.gradingScale,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      template,
      message: 'Template reset to default configuration successfully'
    });
  } catch (error) {
    console.error('Error resetting report card template:', error);
    return NextResponse.json(
      { error: 'Failed to reset template' },
      { status: 500 }
    );
  }
}