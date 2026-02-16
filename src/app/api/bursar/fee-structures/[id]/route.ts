import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Get the existing fee structure to check for related payments
    const existingFeeStructure = await prisma.feeStructure.findUnique({
      where: { id },
      include: {
        class: true
      }
    });

    if (!existingFeeStructure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    // Check if any payments exist for students in this class/term to prevent editing
    const existingPayments = await prisma.payment.count({
      where: {
        student: {
          classId: existingFeeStructure.classId,
          schoolId: session.user.schoolId
        }
      }
    })

    if (existingPayments > 0) {
      return NextResponse.json(
        { error: 'Cannot update fee structure after payments have been recorded' },
        { status: 400 }
      )
    }

    // Update fee structure
    const updatedFeeStructure = await prisma.feeStructure.update({
      where: { id },
      data: {
        totalAmount: body.totalAmount || 0,
        updatedAt: new Date()
      }
    })

    // Update fee items based on the new breakdown
    if (body.breakdown) {
      // First, delete existing fee items for this structure
      await prisma.feeItem.deleteMany({
        where: { feeStructureId: id }
      });

      const feeItemsData = [];
      
      if (body.breakdown.tuition > 0) {
        feeItemsData.push({
          feeStructureId: id,
          schoolId: session.user.schoolId,
          name: 'Tuition Fee',
          category: 'TUITION',
          amount: body.breakdown.tuition,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.development > 0) {
        feeItemsData.push({
          feeStructureId: id,
          schoolId: session.user.schoolId,
          name: 'Development Fee',
          category: 'EXAMINATION',
          amount: body.breakdown.development,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.meals > 0) {
        feeItemsData.push({
          feeStructureId: id,
          schoolId: session.user.schoolId,
          name: 'Meals Fee',
          category: 'MEALS',
          amount: body.breakdown.meals,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.boarding > 0) {
        feeItemsData.push({
          feeStructureId: id,
          schoolId: session.user.schoolId,
          name: 'Boarding Fee',
          category: 'BOARDING',
          amount: body.breakdown.boarding,
          isOptional: false,
          isOneTime: false
        });
      }

      // Add optional fees
      if (body.breakdown.optional && Array.isArray(body.breakdown.optional)) {
        body.breakdown.optional.forEach((item: { name: string; amount: number }) => {
          feeItemsData.push({
            feeStructureId: id,
            schoolId: session.user.schoolId,
            name: item.name,
            category: 'OTHER',
            amount: item.amount,
            isOptional: true,
            isOneTime: false
          });
        });
      }

      // Create new fee items
      if (feeItemsData.length > 0) {
        await prisma.feeItem.createMany({
          data: feeItemsData
        });
      }
    }

    // Get the updated fee structure with related data to return
    const finalFeeStructure = await prisma.feeStructure.findUnique({
      where: { id },
      include: {
        class: true,
        term: {
          include: {
            academicYear: true
          }
        }
      }
    });

    // Get updated fee items to build the breakdown
    const feeItems = await prisma.feeItem.findMany({
      where: { feeStructureId: id }
    });

    // Build the breakdown from fee items
    const breakdown = {
      tuition: 0,
      development: 0,
      meals: 0,
      boarding: 0,
      optional: [] as { name: string; amount: number }[]
    };

    feeItems.forEach(item => {
      switch (item.category) {
        case 'TUITION':
          breakdown.tuition += item.amount;
          break;
        case 'BOARDING':
          breakdown.boarding += item.amount;
          break;
        case 'MEALS':
          breakdown.meals += item.amount;
          break;
        case 'EXAMINATION':
          breakdown.development += item.amount;
          break;
        default:
          breakdown.optional.push({
            name: item.name,
            amount: item.amount
          });
      }
    });

    return NextResponse.json({
      success: true,
      structure: {
        id: finalFeeStructure!.id,
        classId: finalFeeStructure!.classId,
        className: finalFeeStructure!.class?.name || 'Unknown',
        stream: finalFeeStructure!.class?.stream || null,
        term: finalFeeStructure!.term.name,
        academicYear: finalFeeStructure!.term.academicYear.name,
        totalAmount: finalFeeStructure!.totalAmount,
        breakdown,
        updatedAt: finalFeeStructure!.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error updating fee structure:', error)
    return NextResponse.json(
      { error: 'Failed to update fee structure' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the fee structure first
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id }
    })

    if (!feeStructure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      )
    }

    // Check if any payments exist for students in this class
    const existingPayments = await prisma.payment.count({
      where: {
        student: {
          classId: feeStructure.classId,
          schoolId: session.user.schoolId
        }
      }
    })

    if (existingPayments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee structure with associated payments' },
        { status: 400 }
      )
    }

    // Delete related fee items first
    await prisma.feeItem.deleteMany({
      where: { feeStructureId: id }
    });

    // Then delete the fee structure
    await prisma.feeStructure.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Fee structure deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting fee structure:', error)
    return NextResponse.json(
      { error: 'Failed to delete fee structure' },
      { status: 500 }
    )
  }
}
