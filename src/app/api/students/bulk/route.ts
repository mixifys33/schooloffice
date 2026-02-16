/**
 * Bulk Students Upload API Route
 * Requirements: 3.7 - Validate and create multiple student records via CSV
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { StudentStatus, PilotType, Gender, RelationshipType, MessageChannel } from '@/types/enums'

interface BulkStudentInput {
  firstName: string
  lastName: string
  admissionNumber: string
  gender?: string
  dateOfBirth?: string
  className: string
  streamName?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

interface BulkUploadResult {
  success: boolean
  created: number
  failed: number
  errors: string[]
  createdClasses: string[] // Classes that were auto-created during upload
}

// POST: Bulk create students from CSV data
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { students } = body as { students: BulkStudentInput[] }

    console.log('Bulk upload request received:', {
      studentsCount: students?.length,
      firstStudent: students?.[0],
      requestSize: JSON.stringify(body).length
    })

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'No student data provided' },
        { status: 400 }
      )
    }

    if (students.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 students per upload' },
        { status: 400 }
      )
    }

    // Log first student for debugging
    console.log('First student received:', students[0])
    console.log('Student keys:', Object.keys(students[0]))
    console.log('Required field values:', {
      firstName: students[0]?.firstName,
      lastName: students[0]?.lastName,
      admissionNumber: students[0]?.admissionNumber,
      className: students[0]?.className
    })

    // Get all classes and streams for the school
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: { 
        streams: true
      }
    })

    const classMap = new Map(classes.map((c) => [c.name.toLowerCase(), c]))

    // Get existing admission numbers in one query
    const existingAdmissions = await prisma.student.findMany({
      where: { 
        schoolId,
        admissionNumber: {
          in: students.map(s => s.admissionNumber?.trim()).filter(Boolean)
        }
      },
      select: { admissionNumber: true },
    })
    const existingAdmissionSet = new Set(existingAdmissions.map((s) => s.admissionNumber.toLowerCase()))

    const result: BulkUploadResult = {
      success: true,
      created: 0,
      failed: 0,
      errors: [],
      createdClasses: [],
    }

    // Track classes that need to be created
    const classesToCreate = new Set<string>()

    // Prepare all student data first (validation phase)
    const validStudents: Array<{
      data: any
      guardianData?: any
      rowNum: number
      admissionNumber: string
    }> = []

    // Process each student for validation and preparation
    for (let i = 0; i < students.length; i++) {
      const studentData = students[i]
      const rowNum = i + 2 // Account for header row and 0-index

      try {
        // Validate required fields with better error messages
        const availableFields = Object.keys(studentData).join(', ')
        
        if (!studentData.firstName?.trim()) {
          throw new Error(`First name is required. Available fields: ${availableFields}`)
        }
        if (!studentData.lastName?.trim()) {
          throw new Error(`Last name is required. Available fields: ${availableFields}`)
        }
        if (!studentData.admissionNumber?.trim()) {
          throw new Error(`Admission number is required. Available fields: ${availableFields}`)
        }
        if (!studentData.className?.trim()) {
          throw new Error(`Class name is required. Available fields: ${availableFields}`)
        }

        // Check for duplicate admission number
        const admissionLower = studentData.admissionNumber.trim().toLowerCase()
        if (existingAdmissionSet.has(admissionLower)) {
          throw new Error(`Admission number "${studentData.admissionNumber}" already exists`)
        }

        // Find class - auto-create if not found
        let classRecord = classMap.get(studentData.className.trim().toLowerCase())
        if (!classRecord) {
          // Auto-create the class
          const className = studentData.className.trim()
          const classNameLower = className.toLowerCase()
          
          // Extract level from class name (e.g., "P1" -> 1, "S2" -> 2, "Grade 3" -> 3)
          const levelMatch = className.match(/\d+/)
          const level = levelMatch ? parseInt(levelMatch[0], 10) : 1
          
          const newClass = await prisma.class.create({
            data: {
              schoolId,
              name: className,
              level,
            },
            include: { streams: true },
          })
          
          // Add to classMap for subsequent students
          classMap.set(classNameLower, newClass)
          classRecord = newClass
          
          // Track created class for the response
          if (!classesToCreate.has(className)) {
            classesToCreate.add(className)
            result.createdClasses.push(className)
          }
        }

        // Find stream if provided - auto-create if not found
        let streamId: string | null = null
        if (studentData.streamName?.trim()) {
          const streamName = studentData.streamName.trim()
          let stream = classRecord.streams.find(
            (s) => s.name.toLowerCase() === streamName.toLowerCase()
          )
          if (!stream) {
            // Auto-create the stream
            stream = await prisma.stream.create({
              data: {
                classId: classRecord.id,
                name: streamName,
              },
            })
            // Add to classRecord streams for subsequent students
            classRecord.streams.push(stream)
          }
          streamId = stream.id
        }

        // Validate gender if provided
        let gender: Gender | null = null
        if (studentData.gender?.trim()) {
          const genderUpper = studentData.gender.trim().toUpperCase()
          if (genderUpper === 'MALE' || genderUpper === 'M') {
            gender = Gender.MALE
          } else if (genderUpper === 'FEMALE' || genderUpper === 'F') {
            gender = Gender.FEMALE
          } else {
            throw new Error(`Invalid gender "${studentData.gender}". Use MALE/M or FEMALE/F`)
          }
        }

        // Parse date of birth if provided
        let dateOfBirth: Date | null = null
        if (studentData.dateOfBirth?.trim()) {
          dateOfBirth = new Date(studentData.dateOfBirth.trim())
          if (isNaN(dateOfBirth.getTime())) {
            throw new Error(`Invalid date of birth "${studentData.dateOfBirth}". Use YYYY-MM-DD format`)
          }
        }

        // Validate phone number if provided
        if (studentData.parentPhone?.trim()) {
          const phone = studentData.parentPhone.trim()
          // Basic phone validation - should start with + or be numeric
          if (!phone.match(/^[\+]?[\d\s\-\(\)]+$/)) {
            throw new Error(`Invalid phone number "${phone}"`)
          }
        }

        // Prepare student data
        const preparedStudentData = {
          schoolId,
          firstName: studentData.firstName.trim(),
          lastName: studentData.lastName.trim(),
          admissionNumber: studentData.admissionNumber.trim(),
          classId: classRecord.id,
          streamId,
          gender,
          dateOfBirth,
          pilotType: PilotType.FREE,
          smsLimitPerTerm: 2,
          smsSentCount: 0,
          status: StudentStatus.ACTIVE,
          enrollmentDate: new Date(),
        }

        // Prepare guardian data if phone is provided (phone is required for Guardian)
        let guardianData = null
        if (studentData.parentPhone?.trim()) {
          const parentNameParts = (studentData.parentName?.trim() || 'Parent').split(' ')
          const parentFirstName = parentNameParts[0] || 'Parent'
          const parentLastName = parentNameParts.slice(1).join(' ') || studentData.lastName.trim()

          guardianData = {
            schoolId,
            firstName: parentFirstName,
            lastName: parentLastName,
            phone: studentData.parentPhone.trim(),
            email: studentData.parentEmail?.trim() || null,
            relationship: RelationshipType.GUARDIAN,
            preferredChannel: MessageChannel.SMS,
            consentGiven: false,
          }
        }

        validStudents.push({
          data: preparedStudentData,
          guardianData,
          rowNum,
          admissionNumber: studentData.admissionNumber.trim()
        })

        // Add to existing set to prevent duplicates within same upload
        existingAdmissionSet.add(admissionLower)

      } catch (err) {
        result.failed++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        result.errors.push(`Row ${rowNum} (${studentData.admissionNumber || 'Unknown'}): ${errorMsg}`)
      }
    }

    // Batch create students and guardians
    const createdStudents = []
    for (const validStudent of validStudents) {
      try {
        await prisma.$transaction(async (tx) => {
          const student = await tx.student.create({
            data: validStudent.data,
          })

          // Create guardian if data provided
          if (validStudent.guardianData) {
            const guardian = await tx.guardian.create({
              data: validStudent.guardianData,
            })

            await tx.studentGuardian.create({
              data: {
                studentId: student.id,
                guardianId: guardian.id,
                isPrimary: true,
              },
            })
          }

          createdStudents.push(student)
        })

        result.created++
      } catch (err) {
        result.failed++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        result.errors.push(`Row ${validStudent.rowNum} (${validStudent.admissionNumber}): ${errorMsg}`)
      }
    }

    result.success = result.failed === 0

    return NextResponse.json(result, { status: result.success ? 201 : 207 })
  } catch (error) {
    console.error('Error in bulk upload:', error)
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Detailed error:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    
    return NextResponse.json(
      { 
        error: `Failed to process bulk upload: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
