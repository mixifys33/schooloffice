/**
 * Individual Support Request API Route
 * 
 * Handles operations on specific support requests
 * Requirements: Admin support request management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types/enums';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Build where clause
    const where: any = { id };

    // For school admins, only show requests from their school
    if (session.user.role === Role.SCHOOL_ADMIN && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    // Fetch support request
    const supportRequest = await prisma.supportRequest.findFirst({
      where,
      include: {
        school: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!supportRequest) {
      return NextResponse.json(
        { error: 'Support request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: supportRequest,
    });

  } catch (error) {
    console.error('Error fetching support request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch support request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Parse request body
    const body = await request.json();
    const { status, priority, assignedTo, resolution } = body;

    // Build where clause
    const where: any = { id };

    // For school admins, only update requests from their school
    if (session.user.role === Role.SCHOOL_ADMIN && session.user.schoolId) {
      where.schoolId = session.user.schoolId;
    }

    // Check if support request exists
    const existingRequest = await prisma.supportRequest.findFirst({
      where,
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Support request not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      
      // If resolving, set resolved info
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedBy = session.user.id;
        updateData.resolvedAt = new Date();
        if (resolution) {
          updateData.resolution = resolution;
        }
      }
    }

    if (priority !== undefined) {
      updateData.priority = Math.max(1, Math.min(3, priority));
    }

    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }

    // Update support request
    const updatedRequest = await prisma.supportRequest.update({
      where: { id },
      data: updateData,
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
      request: updatedRequest,
    });

  } catch (error) {
    console.error('Error updating support request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update support request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only super admins can delete support requests
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if support request exists
    const existingRequest = await prisma.supportRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Support request not found' },
        { status: 404 }
      );
    }

    // Delete support request
    await prisma.supportRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Support request deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting support request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete support request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}