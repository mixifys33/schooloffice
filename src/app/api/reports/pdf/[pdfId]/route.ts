import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/reports/pdf/[pdfId]
 * 
 * Serve a PDF report card from database storage
 * 
 * This endpoint:
 * 1. Retrieves PDF data from database
 * 2. Converts base64 to buffer
 * 3. Serves as downloadable PDF
 * 4. Logs access for analytics
 * 
 * Public endpoint - no authentication required
 * (PDFs are accessed via unique, hard-to-guess IDs)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pdfId: string }> }
) {
  const { pdfId } = await params
  
  console.log('📄 [PDF] GET /api/reports/pdf/' + pdfId)
  console.log('🔍 [PDF] Looking up PDF in database...')

  try {
    // Get PDF from database
    const pdfStorage = await prisma.pDFStorage.findUnique({
      where: { id: pdfId },
      select: {
        pdfData: true,
        studentId: true,
        termId: true,
        schoolId: true,
        fileSize: true,
        createdAt: true,
      },
    })

    if (!pdfStorage) {
      console.log('❌ [PDF] PDF not found')
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    console.log('✅ [PDF] PDF found:', {
      studentId: pdfStorage.studentId,
      termId: pdfStorage.termId,
      fileSize: pdfStorage.fileSize,
      createdAt: pdfStorage.createdAt,
    })

    // Convert base64 to buffer
    console.log('🔄 [PDF] Converting base64 to buffer...')
    const pdfBuffer = Buffer.from(pdfStorage.pdfData, 'base64')
    console.log(`✅ [PDF] Buffer created (${pdfBuffer.length} bytes)`)

    // Log access (optional - for analytics)
    console.log('📊 [PDF] Logging access...')
    await prisma.pDFAccess.create({
      data: {
        pdfStorageId: pdfId,
        accessedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    }).catch((err) => {
      console.log('⚠️ [PDF] Failed to log access:', err.message)
    })

    console.log('✅ [PDF] Serving PDF...')

    // Serve PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="report-card-${pdfStorage.studentId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error: any) {
    console.error('❌ [PDF] Error:', error)
    return NextResponse.json(
      { error: 'Failed to serve PDF', details: error.message },
      { status: 500 }
    )
  }
}
