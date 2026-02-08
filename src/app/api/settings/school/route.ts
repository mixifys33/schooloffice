/**
 * SCHOOL SETTINGS API
 * 
 * Handles school identity and basic information management.
 * Used by the school identity settings component.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify school admin or super admin role
    if (!session.user.roles?.includes('SCHOOL_ADMIN') &&
        !session.user.roles?.includes('SUPER_ADMIN') &&
        session.user.role !== 'SCHOOL_ADMIN' &&
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only school administrators can access school settings'
      }, { status: 403 });
    }

    const schoolId = session.user.schoolId;
    
    if (!schoolId) {
      return NextResponse.json({ 
        error: 'No school associated with user' 
      }, { status: 400 });
    }

    // Get school data
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        schoolType: true,
        registrationNumber: true,
        ownership: true,
        country: true,
        district: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
        licenseType: true,
        smsBudgetPerTerm: true,
        features: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!school) {
      return NextResponse.json({ 
        error: 'School not found' 
      }, { status: 404 });
    }

    // Get school statistics
    const [
      totalUsers,
      totalClasses,
      totalSubjects,
      roleBreakdown
    ] = await Promise.all([
      db.user.count({ where: { schoolId, isActive: true } }),
      db.class.count({ where: { schoolId } }),
      db.subject.count({ where: { schoolId, isActive: true } }),
      db.user.groupBy({
        by: ['role'],
        where: { schoolId, isActive: true },
        _count: { role: true }
      })
    ]);

    const stats = {
      totalUsers,
      totalClasses,
      totalSubjects,
      roleBreakdown: roleBreakdown.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      success: true,
      school,
      stats
    });

  } catch (error) {
    console.error('Error fetching school settings:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch school settings'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify school admin or super admin role
    if (!session.user.roles?.includes('SCHOOL_ADMIN') &&
        !session.user.roles?.includes('SUPER_ADMIN') &&
        session.user.role !== 'SCHOOL_ADMIN' &&
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only school administrators can update school settings'
      }, { status: 403 });
    }

    const schoolId = session.user.schoolId;
    
    if (!schoolId) {
      return NextResponse.json({ 
        error: 'No school associated with user' 
      }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      schoolType,
      registrationNumber,
      ownership,
      district,
      address,
      phone,
      email,
      logo,
      smsBudgetPerTerm,
      features
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'School name is required' 
      }, { status: 400 });
    }

    // Update school data
    const updatedSchool = await db.school.update({
      where: { id: schoolId },
      data: {
        name,
        schoolType,
        registrationNumber: registrationNumber || null,
        ownership,
        district: district || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        logo: logo || null,
        smsBudgetPerTerm: smsBudgetPerTerm ? parseInt(smsBudgetPerTerm) : null,
        features: features || {},
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        code: true,
        schoolType: true,
        registrationNumber: true,
        ownership: true,
        country: true,
        district: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
        licenseType: true,
        smsBudgetPerTerm: true,
        features: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        schoolId,
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'SCHOOL_SETTINGS',
        resourceId: schoolId,
        details: {
          updatedFields: Object.keys(body),
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      school: updatedSchool,
      message: 'School settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating school settings:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update school settings'
    }, { status: 500 });
  }
}