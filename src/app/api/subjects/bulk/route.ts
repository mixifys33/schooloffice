import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canWrite } from '@/lib/rbac'
import { Role } from '@/types/enums'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    const userRole = session.user.role as Role

    if (!schoolId || !canWrite(userRole, 'subject')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { subjects } = await request.json()

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: subjects array is required' },
        { status: 400 }
      )
    }

    let created = 0
    let failed = 0
    const errors: string[] = []

    for (const subject of subjects) {
      try {
        // Validate required fields
        if (!subject.name || !subject.code || !subject.levelType) {
          errors.push(`Row ${subject.rowNumber || '?'}: Name, code, and level type are required`)
          failed++
          continue
        }

        // Validate levelType
        if (!['O_LEVEL', 'A_LEVEL'].includes(subject.levelType)) {
          errors.push(`${subject.code}: Invalid level type "${subject.levelType}"`)
          failed++
          continue
        }

        // Check for duplicate code in the school
        const existing = await prisma.subject.findFirst({
          where: { 
            schoolId, 
            code: subject.code.toUpperCase() 
          },
        })

        if (existing) {
          errors.push(`${subject.code}: Subject code already exists`)
          failed++
          continue
        }

        // Create the subject
        // For A-Level subjects, isCompulsory is always false
        await prisma.subject.create({
          data: {
            schoolId,
            name: subject.name.trim(),
            code: subject.code.toUpperCase().trim(),
            levelType: subject.levelType,
            isCompulsory: subject.levelType === 'O_LEVEL' ? (subject.isCompulsory ?? true) : false,
            educationLevel: 'SECONDARY', // Default to SECONDARY for O/A Level
            isActive: true,
          },
        })
        created++
      } catch (error) {
        console.error(`Error creating subject ${subject.code}:`, error)
        errors.push(
          `${subject.code}: ${error instanceof Error ? error.message : 'Failed to create'}`
        )
        failed++
      }
    }

    return NextResponse.json({ 
      created, 
      failed, 
      errors,
      message: `Successfully created ${created} subject(s). ${failed} failed.`
    })
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
