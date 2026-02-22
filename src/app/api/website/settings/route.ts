import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET website settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.websiteSettings.findUnique({
      where: { schoolId: session.user.schoolId },
    });

    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        siteName: 'School Website',
        primaryColor: '#1e40af',
        secondaryColor: '#64748b',
        accentColor: '#f59e0b',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        headingFont: 'Inter',
        bodyFont: 'Inter',
        showGallery: true,
        showEvents: true,
        showNews: true,
        showTestimonials: true,
        isPublished: false,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website settings' },
      { status: 500 }
    );
  }
}

// POST/PUT website settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const settings = await prisma.websiteSettings.upsert({
      where: { schoolId: session.user.schoolId },
      create: {
        schoolId: session.user.schoolId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving website settings:', error);
    return NextResponse.json(
      { error: 'Failed to save website settings' },
      { status: 500 }
    );
  }
}
