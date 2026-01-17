/**
 * Document Generation Service
 * Handles generation of official school documents (admission letters, transfer letters, ID cards)
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
import { prisma } from '@/lib/db'
import { documentService } from './document.service'
import { Student, School, Class, Stream } from '@/types'

/**
 * Document types that can be generated
 */
export type GeneratedDocumentType = 'admission_letter' | 'transfer_letter' | 'id_card'

/**
 * Admission letter data structure
 */
export interface AdmissionLetterData {
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
    dateOfBirth?: Date
    gender?: string
  }
  school: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo?: string
  }
  class: {
    name: string
    level: number
  }
  stream?: {
    name: string
  }
  enrollmentDate: Date
  generatedAt: Date
}

/**
 * Transfer letter data structure
 */
export interface TransferLetterData {
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
    dateOfBirth?: Date
    gender?: string
    enrollmentDate: Date
    status: string
  }
  school: {
    name: string
    address?: string
    phone?: string
    email?: string
    logo?: string
  }
  class: {
    name: string
    level: number
  }
  stream?: {
    name: string
  }
  academicHistory: {
    termName: string
    academicYear: string
    average: number
    position: number
    totalStudents: number
    grade?: string
  }[]
  transferDate: Date
  generatedAt: Date
}

/**
 * ID card data structure
 */
export interface IDCardData {
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
    dateOfBirth?: Date
    gender?: string
    photo?: string
  }
  school: {
    name: string
    address?: string
    phone?: string
    logo?: string
  }
  class: {
    name: string
  }
  stream?: {
    name: string
  }
  validUntil: Date
  generatedAt: Date
}

/**
 * Generated document result
 */
export interface GeneratedDocument {
  type: GeneratedDocumentType
  studentId: string
  htmlContent: string
  documentId?: string
  generatedAt: Date
}


export class DocumentGenerationService {
  /**
   * Get student with related data for document generation
   */
  private async getStudentWithDetails(studentId: string): Promise<{
    student: Student
    school: School
    class: Class
    stream?: Stream
  } | null> {
    const studentRecord = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        class: true,
        stream: true,
      },
    })

    if (!studentRecord) return null

    return {
      student: {
        id: studentRecord.id,
        schoolId: studentRecord.schoolId,
        admissionNumber: studentRecord.admissionNumber,
        firstName: studentRecord.firstName,
        lastName: studentRecord.lastName,
        dateOfBirth: studentRecord.dateOfBirth ?? undefined,
        gender: studentRecord.gender as Student['gender'],
        classId: studentRecord.classId,
        streamId: studentRecord.streamId ?? undefined,
        pilotType: studentRecord.pilotType as Student['pilotType'],
        smsLimitPerTerm: studentRecord.smsLimitPerTerm,
        smsSentCount: studentRecord.smsSentCount,
        photo: studentRecord.photo ?? undefined,
        medicalInfo: studentRecord.medicalInfo ?? undefined,
        enrollmentDate: studentRecord.enrollmentDate,
        status: studentRecord.status as Student['status'],
        createdAt: studentRecord.createdAt,
        updatedAt: studentRecord.updatedAt,
      },
      school: {
        id: studentRecord.school.id,
        name: studentRecord.school.name,
        code: studentRecord.school.code,
        address: studentRecord.school.address ?? undefined,
        phone: studentRecord.school.phone ?? undefined,
        email: studentRecord.school.email ?? undefined,
        logo: studentRecord.school.logo ?? undefined,
        licenseType: studentRecord.school.licenseType as School['licenseType'],
        features: studentRecord.school.features as School['features'],
        smsBudgetPerTerm: studentRecord.school.smsBudgetPerTerm,
        createdAt: studentRecord.school.createdAt,
        updatedAt: studentRecord.school.updatedAt,
        isActive: studentRecord.school.isActive,
      },
      class: {
        id: studentRecord.class.id,
        schoolId: studentRecord.class.schoolId,
        name: studentRecord.class.name,
        level: studentRecord.class.level,
        createdAt: studentRecord.class.createdAt,
        updatedAt: studentRecord.class.updatedAt,
      },
      stream: studentRecord.stream ? {
        id: studentRecord.stream.id,
        classId: studentRecord.stream.classId,
        name: studentRecord.stream.name,
        createdAt: studentRecord.stream.createdAt,
        updatedAt: studentRecord.stream.updatedAt,
      } : undefined,
    }
  }

  /**
   * Get academic history for a student (for transfer letters)
   * Requirement 14.2: Include academic history summary
   */
  private async getAcademicHistory(studentId: string): Promise<TransferLetterData['academicHistory']> {
    const results = await prisma.result.findMany({
      where: { studentId },
      include: {
        term: {
          include: {
            academicYear: true,
          },
        },
      },
      orderBy: [
        { term: { academicYear: { startDate: 'desc' } } },
        { term: { startDate: 'desc' } },
      ],
    })

    return results.map((result) => ({
      termName: result.term.name,
      academicYear: result.term.academicYear.name,
      average: result.average,
      position: result.position,
      totalStudents: result.totalStudents ?? 0,
      grade: result.grade ?? undefined,
    }))
  }


  // ============================================
  // ADMISSION LETTER GENERATION
  // ============================================

  /**
   * Generate admission letter data
   * Requirement 14.1: Generate PDF with student details and school letterhead
   */
  async generateAdmissionLetterData(studentId: string): Promise<AdmissionLetterData | null> {
    const details = await this.getStudentWithDetails(studentId)
    if (!details) return null

    const { student, school, class: classInfo, stream } = details

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
      },
      school: {
        name: school.name,
        address: school.address,
        phone: school.phone,
        email: school.email,
        logo: school.logo,
      },
      class: {
        name: classInfo.name,
        level: classInfo.level,
      },
      stream: stream ? { name: stream.name } : undefined,
      enrollmentDate: student.enrollmentDate,
      generatedAt: new Date(),
    }
  }

  /**
   * Generate admission letter HTML content
   * Requirement 14.1: Generate PDF with student details and school letterhead
   */
  generateAdmissionLetterHTML(data: AdmissionLetterData): string {
    const studentName = `${data.student.firstName} ${data.student.lastName}`
    const classDisplay = data.stream 
      ? `${data.class.name} (${data.stream.name})`
      : data.class.name

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Admission Letter - ${studentName}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
    .letterhead { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .school-logo { max-height: 80px; margin-bottom: 10px; }
    .school-name { font-size: 24px; font-weight: bold; text-transform: uppercase; }
    .school-contact { font-size: 12px; color: #666; }
    .letter-date { text-align: right; margin-bottom: 30px; }
    .letter-title { text-align: center; font-size: 18px; font-weight: bold; text-decoration: underline; margin: 30px 0; }
    .letter-body { text-align: justify; }
    .student-details { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #333; }
    .detail-row { margin: 8px 0; }
    .detail-label { font-weight: bold; display: inline-block; width: 180px; }
    .signature-section { margin-top: 60px; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 50px; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="letterhead">
    ${data.school.logo ? `<img src="${data.school.logo}" class="school-logo" alt="School Logo">` : ''}
    <div class="school-name">${data.school.name}</div>
    <div class="school-contact">
      ${data.school.address ? `${data.school.address}<br>` : ''}
      ${data.school.phone ? `Tel: ${data.school.phone}` : ''}
      ${data.school.email ? ` | Email: ${data.school.email}` : ''}
    </div>
  </div>

  <div class="letter-date">
    Date: ${data.generatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>

  <div class="letter-title">LETTER OF ADMISSION</div>

  <div class="letter-body">
    <p>Dear Parent/Guardian,</p>

    <p>We are pleased to inform you that your child/ward has been admitted to <strong>${data.school.name}</strong>. 
    Please find the admission details below:</p>

    <div class="student-details">
      <div class="detail-row"><span class="detail-label">Student Name:</span> ${studentName}</div>
      <div class="detail-row"><span class="detail-label">Admission Number:</span> ${data.student.admissionNumber}</div>
      <div class="detail-row"><span class="detail-label">Class:</span> ${classDisplay}</div>
      ${data.student.dateOfBirth ? `<div class="detail-row"><span class="detail-label">Date of Birth:</span> ${data.student.dateOfBirth.toLocaleDateString('en-GB')}</div>` : ''}
      ${data.student.gender ? `<div class="detail-row"><span class="detail-label">Gender:</span> ${data.student.gender}</div>` : ''}
      <div class="detail-row"><span class="detail-label">Date of Admission:</span> ${data.enrollmentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>

    <p>We welcome ${data.student.firstName} to our school community and look forward to a fruitful academic journey together.</p>

    <p>Please ensure that all required documents and fees are submitted as per the school guidelines.</p>

    <p>Congratulations and welcome to ${data.school.name}!</p>

    <div class="signature-section">
      <p>Yours faithfully,</p>
      <div class="signature-line"></div>
      <p><strong>Head Teacher</strong><br>${data.school.name}</p>
    </div>
  </div>

  <div class="footer">
    <p>This is an official document generated by ${data.school.name} on ${data.generatedAt.toLocaleDateString('en-GB')}</p>
  </div>
</body>
</html>`
  }


  // ============================================
  // TRANSFER LETTER GENERATION
  // ============================================

  /**
   * Generate transfer letter data
   * Requirement 14.2: Generate PDF including academic history summary
   */
  async generateTransferLetterData(studentId: string): Promise<TransferLetterData | null> {
    const details = await this.getStudentWithDetails(studentId)
    if (!details) return null

    const { student, school, class: classInfo, stream } = details
    const academicHistory = await this.getAcademicHistory(studentId)

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        enrollmentDate: student.enrollmentDate,
        status: student.status,
      },
      school: {
        name: school.name,
        address: school.address,
        phone: school.phone,
        email: school.email,
        logo: school.logo,
      },
      class: {
        name: classInfo.name,
        level: classInfo.level,
      },
      stream: stream ? { name: stream.name } : undefined,
      academicHistory,
      transferDate: new Date(),
      generatedAt: new Date(),
    }
  }

  /**
   * Generate transfer letter HTML content
   * Requirement 14.2: Generate PDF including academic history summary
   */
  generateTransferLetterHTML(data: TransferLetterData): string {
    const studentName = `${data.student.firstName} ${data.student.lastName}`
    const classDisplay = data.stream 
      ? `${data.class.name} (${data.stream.name})`
      : data.class.name

    const academicHistoryRows = data.academicHistory.length > 0
      ? data.academicHistory.map(h => `
          <tr>
            <td>${h.academicYear}</td>
            <td>${h.termName}</td>
            <td>${h.average.toFixed(1)}</td>
            <td>${h.position} of ${h.totalStudents}</td>
            <td>${h.grade || '-'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5" style="text-align: center;">No academic records available</td></tr>'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transfer Letter - ${studentName}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
    .letterhead { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .school-logo { max-height: 80px; margin-bottom: 10px; }
    .school-name { font-size: 24px; font-weight: bold; text-transform: uppercase; }
    .school-contact { font-size: 12px; color: #666; }
    .letter-date { text-align: right; margin-bottom: 30px; }
    .letter-title { text-align: center; font-size: 18px; font-weight: bold; text-decoration: underline; margin: 30px 0; }
    .letter-body { text-align: justify; }
    .student-details { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #333; }
    .detail-row { margin: 8px 0; }
    .detail-label { font-weight: bold; display: inline-block; width: 180px; }
    .academic-history { margin: 20px 0; }
    .academic-history h3 { margin-bottom: 10px; }
    .academic-history table { width: 100%; border-collapse: collapse; }
    .academic-history th, .academic-history td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .academic-history th { background-color: #f4f4f4; }
    .signature-section { margin-top: 60px; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 50px; }
    .stamp-area { margin-top: 20px; text-align: center; }
    .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="letterhead">
    ${data.school.logo ? `<img src="${data.school.logo}" class="school-logo" alt="School Logo">` : ''}
    <div class="school-name">${data.school.name}</div>
    <div class="school-contact">
      ${data.school.address ? `${data.school.address}<br>` : ''}
      ${data.school.phone ? `Tel: ${data.school.phone}` : ''}
      ${data.school.email ? ` | Email: ${data.school.email}` : ''}
    </div>
  </div>

  <div class="letter-date">
    Date: ${data.generatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>

  <div class="letter-title">TRANSFER CERTIFICATE / LEAVING LETTER</div>

  <div class="letter-body">
    <p>To Whom It May Concern,</p>

    <p>This is to certify that the student whose details appear below was a bonafide student of <strong>${data.school.name}</strong>.</p>

    <div class="student-details">
      <div class="detail-row"><span class="detail-label">Student Name:</span> ${studentName}</div>
      <div class="detail-row"><span class="detail-label">Admission Number:</span> ${data.student.admissionNumber}</div>
      <div class="detail-row"><span class="detail-label">Last Class Attended:</span> ${classDisplay}</div>
      ${data.student.dateOfBirth ? `<div class="detail-row"><span class="detail-label">Date of Birth:</span> ${data.student.dateOfBirth.toLocaleDateString('en-GB')}</div>` : ''}
      ${data.student.gender ? `<div class="detail-row"><span class="detail-label">Gender:</span> ${data.student.gender}</div>` : ''}
      <div class="detail-row"><span class="detail-label">Date of Admission:</span> ${data.student.enrollmentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="detail-row"><span class="detail-label">Date of Leaving:</span> ${data.transferDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>

    <div class="academic-history">
      <h3>Academic Performance Summary</h3>
      <table>
        <thead>
          <tr>
            <th>Academic Year</th>
            <th>Term</th>
            <th>Average</th>
            <th>Position</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${academicHistoryRows}
        </tbody>
      </table>
    </div>

    <p>The student's conduct during their time at our institution was satisfactory. We wish them all the best in their future academic endeavors.</p>

    <p>This certificate is issued upon request for the purpose of seeking admission to another institution.</p>

    <div class="signature-section">
      <p>Yours faithfully,</p>
      <div class="signature-line"></div>
      <p><strong>Head Teacher</strong><br>${data.school.name}</p>
      <div class="stamp-area">
        <p><em>[Official School Stamp]</em></p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This is an official document generated by ${data.school.name} on ${data.generatedAt.toLocaleDateString('en-GB')}</p>
  </div>
</body>
</html>`
  }


  // ============================================
  // ID CARD GENERATION
  // ============================================

  /**
   * Generate ID card data
   * Requirement 14.3: Produce printable cards with student photo, name, class, and school branding
   */
  async generateIDCardData(studentId: string, validityYears: number = 1): Promise<IDCardData | null> {
    const details = await this.getStudentWithDetails(studentId)
    if (!details) return null

    const { student, school, class: classInfo, stream } = details
    
    const validUntil = new Date()
    validUntil.setFullYear(validUntil.getFullYear() + validityYears)

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photo: student.photo,
      },
      school: {
        name: school.name,
        address: school.address,
        phone: school.phone,
        logo: school.logo,
      },
      class: {
        name: classInfo.name,
      },
      stream: stream ? { name: stream.name } : undefined,
      validUntil,
      generatedAt: new Date(),
    }
  }

  /**
   * Generate ID card HTML content
   * Requirement 14.3: Produce printable cards with student photo, name, class, and school branding
   */
  generateIDCardHTML(data: IDCardData): string {
    const studentName = `${data.student.firstName} ${data.student.lastName}`
    const classDisplay = data.stream 
      ? `${data.class.name} (${data.stream.name})`
      : data.class.name

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student ID Card - ${studentName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .id-card { width: 340px; height: 215px; border: 2px solid #333; border-radius: 10px; overflow: hidden; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .card-header { background: linear-gradient(90deg, #1a365d 0%, #2c5282 100%); color: white; padding: 10px; text-align: center; }
    .school-logo-small { max-height: 30px; vertical-align: middle; margin-right: 10px; }
    .school-name-card { font-size: 14px; font-weight: bold; display: inline-block; vertical-align: middle; }
    .card-body { display: flex; padding: 15px; }
    .photo-section { width: 90px; margin-right: 15px; }
    .student-photo { width: 90px; height: 110px; border: 2px solid #333; background-color: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; }
    .student-photo img { width: 100%; height: 100%; object-fit: cover; }
    .info-section { flex: 1; }
    .info-row { margin: 5px 0; font-size: 11px; }
    .info-label { font-weight: bold; color: #1a365d; }
    .info-value { color: #333; }
    .student-name { font-size: 14px; font-weight: bold; color: #1a365d; margin-bottom: 8px; }
    .card-footer { background-color: #1a365d; color: white; padding: 5px 10px; font-size: 9px; text-align: center; }
    .validity { font-weight: bold; }
    @media print {
      body { margin: 0; }
      .id-card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="id-card">
    <div class="card-header">
      ${data.school.logo ? `<img src="${data.school.logo}" class="school-logo-small" alt="Logo">` : ''}
      <span class="school-name-card">${data.school.name}</span>
    </div>
    <div class="card-body">
      <div class="photo-section">
        <div class="student-photo">
          ${data.student.photo 
            ? `<img src="${data.student.photo}" alt="Student Photo">`
            : 'Photo'}
        </div>
      </div>
      <div class="info-section">
        <div class="student-name">${studentName}</div>
        <div class="info-row">
          <span class="info-label">Adm No:</span>
          <span class="info-value">${data.student.admissionNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Class:</span>
          <span class="info-value">${classDisplay}</span>
        </div>
        ${data.student.dateOfBirth ? `
        <div class="info-row">
          <span class="info-label">DOB:</span>
          <span class="info-value">${data.student.dateOfBirth.toLocaleDateString('en-GB')}</span>
        </div>` : ''}
        ${data.student.gender ? `
        <div class="info-row">
          <span class="info-label">Gender:</span>
          <span class="info-value">${data.student.gender}</span>
        </div>` : ''}
      </div>
    </div>
    <div class="card-footer">
      <span class="validity">Valid Until: ${data.validUntil.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
      ${data.school.phone ? ` | Tel: ${data.school.phone}` : ''}
    </div>
  </div>
</body>
</html>`
  }


  // ============================================
  // DOCUMENT GENERATION AND STORAGE
  // ============================================

  /**
   * Generate admission letter and store in student document repository
   * Requirement 14.1, 14.4: Generate admission letter and store copy
   */
  async generateAdmissionLetter(studentId: string, storeInRepository: boolean = true): Promise<GeneratedDocument> {
    const data = await this.generateAdmissionLetterData(studentId)
    if (!data) {
      throw new Error(`Student with id ${studentId} not found`)
    }

    const htmlContent = this.generateAdmissionLetterHTML(data)
    const generatedAt = new Date()

    let documentId: string | undefined

    if (storeInRepository) {
      // Store in student document repository (Requirement 14.4)
      const storedDoc = await documentService.uploadDocument({
        studentId,
        name: `Admission Letter - ${data.student.firstName} ${data.student.lastName}`,
        type: 'admission_letter',
        url: `data:text/html;base64,${Buffer.from(htmlContent).toString('base64')}`,
        metadata: {
          generatedAt: generatedAt.toISOString(),
          documentType: 'admission_letter',
          studentName: `${data.student.firstName} ${data.student.lastName}`,
          admissionNumber: data.student.admissionNumber,
          className: data.class.name,
        },
      })
      documentId = storedDoc.id
    }

    return {
      type: 'admission_letter',
      studentId,
      htmlContent,
      documentId,
      generatedAt,
    }
  }

  /**
   * Generate transfer letter and store in student document repository
   * Requirement 14.2, 14.4: Generate transfer letter with academic history and store copy
   */
  async generateTransferLetter(studentId: string, storeInRepository: boolean = true): Promise<GeneratedDocument> {
    const data = await this.generateTransferLetterData(studentId)
    if (!data) {
      throw new Error(`Student with id ${studentId} not found`)
    }

    const htmlContent = this.generateTransferLetterHTML(data)
    const generatedAt = new Date()

    let documentId: string | undefined

    if (storeInRepository) {
      // Store in student document repository (Requirement 14.4)
      const storedDoc = await documentService.uploadDocument({
        studentId,
        name: `Transfer Letter - ${data.student.firstName} ${data.student.lastName}`,
        type: 'transfer_letter',
        url: `data:text/html;base64,${Buffer.from(htmlContent).toString('base64')}`,
        metadata: {
          generatedAt: generatedAt.toISOString(),
          documentType: 'transfer_letter',
          studentName: `${data.student.firstName} ${data.student.lastName}`,
          admissionNumber: data.student.admissionNumber,
          lastClass: data.class.name,
          transferDate: data.transferDate.toISOString(),
          academicRecordsCount: data.academicHistory.length,
        },
      })
      documentId = storedDoc.id
    }

    return {
      type: 'transfer_letter',
      studentId,
      htmlContent,
      documentId,
      generatedAt,
    }
  }

  /**
   * Generate ID card and store in student document repository
   * Requirement 14.3, 14.4: Generate ID card and store copy
   */
  async generateIDCard(studentId: string, validityYears: number = 1, storeInRepository: boolean = true): Promise<GeneratedDocument> {
    const data = await this.generateIDCardData(studentId, validityYears)
    if (!data) {
      throw new Error(`Student with id ${studentId} not found`)
    }

    const htmlContent = this.generateIDCardHTML(data)
    const generatedAt = new Date()

    let documentId: string | undefined

    if (storeInRepository) {
      // Store in student document repository (Requirement 14.4)
      const storedDoc = await documentService.uploadDocument({
        studentId,
        name: `ID Card - ${data.student.firstName} ${data.student.lastName}`,
        type: 'id_card',
        url: `data:text/html;base64,${Buffer.from(htmlContent).toString('base64')}`,
        metadata: {
          generatedAt: generatedAt.toISOString(),
          documentType: 'id_card',
          studentName: `${data.student.firstName} ${data.student.lastName}`,
          admissionNumber: data.student.admissionNumber,
          className: data.class.name,
          validUntil: data.validUntil.toISOString(),
        },
      })
      documentId = storedDoc.id
    }

    return {
      type: 'id_card',
      studentId,
      htmlContent,
      documentId,
      generatedAt,
    }
  }

  /**
   * Generate bulk ID cards for a class
   */
  async generateBulkIDCards(
    classId: string,
    validityYears: number = 1,
    storeInRepository: boolean = true
  ): Promise<{ successful: GeneratedDocument[]; failed: { studentId: string; error: string }[] }> {
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    const successful: GeneratedDocument[] = []
    const failed: { studentId: string; error: string }[] = []

    for (const student of students) {
      try {
        const doc = await this.generateIDCard(student.id, validityYears, storeInRepository)
        successful.push(doc)
      } catch (error) {
        failed.push({
          studentId: student.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return { successful, failed }
  }

  /**
   * Get all generated documents for a student by type
   */
  async getGeneratedDocuments(studentId: string, type?: GeneratedDocumentType): Promise<{
    id: string
    name: string
    type: string
    generatedAt: Date
    metadata?: Record<string, unknown>
  }[]> {
    const documents = type
      ? await documentService.getDocumentsByType(studentId, type)
      : await documentService.getDocumentsByStudent(studentId)

    return documents
      .filter(doc => ['admission_letter', 'transfer_letter', 'id_card'].includes(doc.type))
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        generatedAt: doc.uploadedAt,
        metadata: doc.metadata,
      }))
  }
}

// Export singleton instance
export const documentGenerationService = new DocumentGenerationService()
