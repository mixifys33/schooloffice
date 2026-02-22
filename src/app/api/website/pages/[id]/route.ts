import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET single page
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = await prisma.websitePage.findFirst({
      where: {
        id: params.id,
        schoolId: session.user.schoolId,
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// UPDATE page
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const page = await prisma.websitePage.update({
      where: {
        id: params.id,
        schoolId: session.user.schoolId,
      },
      data: {
        ...data,
        updatedBy: session.user.id,
      },
      include: {
        sections: true,
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.websitePage.delete({
      where: {
        id: params.id,
        schoolId: session.user.schoolId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
