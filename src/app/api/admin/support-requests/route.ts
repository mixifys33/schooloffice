/**
 * Admin Support Requests API Route
 * 
 * Handles CRUD operations for support requests
 * Requirements: Admin support request management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types/enums';

export async function GET(request: NextRequest) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate admin role
    if (session.user.role !== Role.SCHOOL_ADMIN && 
        session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const issueType = searchParams.get('issueType');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // For school admins, only show requests from their school
    if (session.user.role === Role.SCHOOL_ADMIN && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (issueType && issueType !== 'all') {
      where.issueType = issueType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch support requests
    const [requests, total] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        include: {
          school: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.supportRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching support requests:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch support requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, email, phone, issueType, message, priority = 1, schoolId } = body;

    // Validate required fields
    if (!name || !email || !issueType || !message) {
      return NextResponse.json(
        { error: 'Name, email, issue type, and message are required' },
        { status: 400 }
      );
    }

    // Determine school ID
    let targetSchoolId = schoolId;
    if (!targetSchoolId && session.user.schoolId) {
      targetSchoolId = session.user.schoolId;
    }

    if (!targetSchoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Create support request
    const supportRequest = await prisma.supportRequest.create({
      data: {
        schoolId: targetSchoolId,
        name,
        email,
        phone,
        issueType,
        message,
        priority: Math.max(1, Math.min(3, priority)), // Ensure priority is 1-3
      },
      include: {
        school: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      request: supportRequest,
    });

  } catch (error) {
    console.error('Error creating support request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create support request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}