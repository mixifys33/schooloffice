import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classSubjects = await prisma.classSubject.findMany({
      where: { 
        classId: params.id,
        subject: {
          schoolId: session.user.schoolId
        }
      },
      include: {
        subject: true
      }
    });

    return NextResponse.json({ classSubjects });
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class subjects' },
      { status: 500 }
    );
  }
}