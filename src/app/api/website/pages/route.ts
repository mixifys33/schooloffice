import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET all pages
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await prisma.websitePage.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        children: true,
      },
      orderBy: { menuOrder: 'asc' },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// CREATE new page
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Generate slug from title if not provided
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const page = await prisma.websitePage.create({
      data: {
        schoolId: session.user.schoolId,
        createdBy: session.user.id,
        slug,
        ...data,
      },
      include: {
        sections: true,
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
