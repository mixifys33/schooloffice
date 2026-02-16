import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classes } = body;

    if (!Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json(
        { error: 'Classes array is required' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const classData of classes) {
      try {
        const { name, level, levelType } = classData;

        // Validate required fields
        if (!name || !level || !levelType) {
          results.failed++;
          results.errors.push(`Row with name "${name || 'unknown'}": Missing required fields`);
          continue;
        }

        // Validate levelType
        if (!['O_LEVEL', 'A_LEVEL'].includes(levelType)) {
          results.failed++;
          results.errors.push(`${name}: Invalid level type "${levelType}"`);
          continue;
        }

        // Validate level range (8-13 for S1-S6)
        const levelNum = parseInt(level, 10);
        if (isNaN(levelNum) || levelNum < 8 || levelNum > 13) {
          results.failed++;
          results.errors.push(`${name}: Level must be between 8 (S1) and 13 (S6)`);
          continue;
        }

        // Check if class already exists
        const existingClass = await prisma.class.findFirst({
          where: {
            schoolId: session.user.schoolId,
            name: name.trim(),
          },
        });

        if (existingClass) {
          results.failed++;
          results.errors.push(`${name}: Class already exists`);
          continue;
        }

        // Create the class
        await prisma.class.create({
          data: {
            schoolId: session.user.schoolId,
            name: name.trim(),
            level: levelNum,
            levelType: levelType,
          },
        });

        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${classData.name || 'unknown'}: ${error instanceof Error ? error.message : 'Failed to create'}`
        );
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Error in bulk class upload:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}
