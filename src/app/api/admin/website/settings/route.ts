import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.websiteSettings.findFirst({
      where: { isActive: true },
    });

    return NextResponse.json(settings || {});
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Deactivate all existing settings
    await prisma.websiteSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new settings
    const settings = await prisma.websiteSettings.create({
      data: {
        ...data,
        isActive: true,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving website settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
