import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classFilter = searchParams.get('class')
    const termFilter = searchParams.get('term')
    const academicYearFilter = searchParams.get('academicYear')

    // Build where clause for filtering
    const whereClause: any = {
      schoolId: session.user.schoolId
    }

    if (classFilter && classFilter !== 'all') {
      whereClause.classId = classFilter
    }

    if (termFilter && termFilter !== 'all') {
      whereClause.term = termFilter
    }

    if (academicYearFilter && academicYearFilter !== 'all') {
      whereClause.academicYear = academicYearFilter
    }

    // Fetch fee structures with related class data
    const feeStructures = await prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        class: true
      },
      orderBy: [
        { class: { name: 'asc' } },
        { term: 'asc' }
      ]
    })

    // Fetch fee items for each structure to build the breakdown
    const formattedStructures = await Promise.all(feeStructures.map(async (structure) => {
      // Get all fee items for this structure
      const feeItems = await prisma.feeItem.findMany({
        where: { feeStructureId: structure.id }
      });

      // Categorize fee items into the expected breakdown structure
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
          case 'EXAMINATION': // Using examination as development fee
            breakdown.development += item.amount;
            break;
          default:
            breakdown.optional.push({
              name: item.name,
              amount: item.amount
            });
        }
      });

      return {
        id: structure.id,
        classId: structure.classId,
        className: structure.class?.name || 'Unknown',
        stream: structure.class?.stream || null,
        term: structure.term.name, // Get term name from related term
        academicYear: structure.term.academicYear.name, // Get academic year name from related term
        totalAmount: structure.totalAmount,
        breakdown,
        createdAt: structure.createdAt.toISOString(),
        updatedAt: structure.updatedAt.toISOString()
      };
    }));

    return NextResponse.json({
      success: true,
      structures: formattedStructures
    })
  } catch (error) {
    console.error('Error fetching fee structures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fee structures' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.classId || !body.termId) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, termId' },
        { status: 400 }
      )
    }

    // Find the term to get its academic year
    const term = await prisma.term.findUnique({
      where: { id: body.termId }
    });

    if (!term) {
      return NextResponse.json(
        { error: 'Invalid term ID' },
        { status: 400 }
      )
    }

    // Create new fee structure
    const feeStructure = await prisma.feeStructure.create({
      data: {
        classId: body.classId,
        termId: body.termId,
        totalAmount: body.totalAmount || 0,
        studentType: body.studentType || 'DAY',
        schoolId: session.user.schoolId,
        createdBy: session.user.id
      }
    })

    // Create fee items based on the breakdown
    if (body.breakdown) {
      const feeItemsData = [];
      
      if (body.breakdown.tuition > 0) {
        feeItemsData.push({
          feeStructureId: feeStructure.id,
          name: 'Tuition Fee',
          category: 'TUITION',
          amount: body.breakdown.tuition,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.development > 0) {
        feeItemsData.push({
          feeStructureId: feeStructure.id,
          name: 'Development Fee',
          category: 'EXAMINATION', // Using examination as development fee
          amount: body.breakdown.development,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.meals > 0) {
        feeItemsData.push({
          feeStructureId: feeStructure.id,
          name: 'Meals Fee',
          category: 'MEALS',
          amount: body.breakdown.meals,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.boarding > 0) {
        feeItemsData.push({
          feeStructureId: feeStructure.id,
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
            feeStructureId: feeStructure.id,
            name: item.name,
            category: 'OTHER',
            amount: item.amount,
            isOptional: true,
            isOneTime: false
          });
        });
      }

      // Create all fee items
      if (feeItemsData.length > 0) {
        await prisma.feeItem.createMany({
          data: feeItemsData
        });
      }
    }

    // Get the updated fee structure with related data to return
    const updatedFeeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructure.id },
      include: {
        class: true,
        term: {
          include: {
            academicYear: true
          }
        }
      }
    });

    // Get fee items to build the breakdown
    const feeItems = await prisma.feeItem.findMany({
      where: { feeStructureId: feeStructure.id }
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
        case 'EXAMINATION': // Using examination as development fee
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
        id: updatedFeeStructure!.id,
        classId: updatedFeeStructure!.classId,
        className: updatedFeeStructure!.class?.name || 'Unknown',
        stream: updatedFeeStructure!.class?.stream || null,
        term: updatedFeeStructure!.term.name,
        academicYear: updatedFeeStructure!.term.academicYear.name,
        totalAmount: updatedFeeStructure!.totalAmount,
        breakdown,
        createdAt: updatedFeeStructure!.createdAt.toISOString(),
        updatedAt: updatedFeeStructure!.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error creating fee structure:', error)
    return NextResponse.json(
      { error: 'Failed to create fee structure' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
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
          name: 'Development Fee',
          category: 'EXAMINATION', // Using examination as development fee
          amount: body.breakdown.development,
          isOptional: false,
          isOneTime: false
        });
      }
      
      if (body.breakdown.meals > 0) {
        feeItemsData.push({
          feeStructureId: id,
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
        case 'EXAMINATION': // Using examination as development fee
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if any payments exist for this fee structure
    const existingPayments = await prisma.payment.count({
      where: {
        student: {
          classId: (await prisma.feeStructure.findUnique({ where: { id } }))?.classId,
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