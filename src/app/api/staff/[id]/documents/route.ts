/**
 * Staff Documents API Route
 * Returns documents for a specific staff member
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/staff/[id]/documents
 * Returns staff documents (contracts, certifications, evaluations, etc.)
 * Requires SCHOOL_ADMIN, DEPUTY, or SUPER_ADMIN permission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this resource' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify staff exists
    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, schoolId: true },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Get documents
    const documents = await prisma.staffDocument.findMany({
      where: { staffId: id },
      orderBy: { uploadedAt: 'desc' },
    })

    // Get uploader names
    const uploaderIds = [...new Set(documents.map(d => d.uploadedBy))]
    const uploaders = await prisma.user.findMany({
      where: { id: { in: uploaderIds } },
      select: { id: true, email: true },
    })
    const uploaderStaff = await prisma.staff.findMany({
      where: { userId: { in: uploaderIds } },
      select: { userId: true, firstName: true, lastName: true },
    })

    const uploaderMap = new Map<string, string>()
    for (const u of uploaders) {
      const staffInfo = uploaderStaff.find(s => s.userId === u.id)
      uploaderMap.set(
        u.id,
        staffInfo ? `${staffInfo.firstName} ${staffInfo.lastName}` : u.email
      )
    }

    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      category: doc.category,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt,
      uploadedBy: uploaderMap.get(doc.uploadedBy) || doc.uploadedBy,
    }))

    return NextResponse.json({ data: formattedDocuments })
  } catch (error) {
    console.error('Error fetching staff documents:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
