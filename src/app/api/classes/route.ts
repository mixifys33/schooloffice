import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: session.user.schoolId },
      include: {
        streams: {
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
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
    const { name, level, levelType } = body;

    if (!name || !level || !levelType) {
      return NextResponse.json(
        { error: 'Name, level, and level type are required' },
        { status: 400 }
      );
    }

    // Validate levelType
    if (!['O_LEVEL', 'A_LEVEL'].includes(levelType)) {
      return NextResponse.json(
        { error: 'Invalid level type. Must be O_LEVEL or A_LEVEL' },
        { status: 400 }
      );
    }

    // Check if class already exists
    const existingClass = await prisma.class.findFirst({
      where: {
        schoolId: session.user.schoolId,
        name: name.trim(),
      },
    });

    if (existingClass) {
      return NextResponse.json(
        { error: 'A class with this name already exists' },
        { status: 409 }
      );
    }

    // Create the class
    const newClass = await prisma.class.create({
      data: {
        schoolId: session.user.schoolId,
        name: name.trim(),
        level: parseInt(level, 10),
        levelType: levelType,
      },
      include: {
        streams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}