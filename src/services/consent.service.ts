/**
 * Consent Management Service
 * Handles data privacy consent, personal data access logging, and data export
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
 */   
import { prisma } from '@/lib/db'
import {
  ConsentRecord,
  CreateConsentRecordInput,
  WithdrawConsentInput,
  PersonalDataAccessLog,
  CreatePersonalDataAccessLogInput,
  DataExportRequest,
  CreateDataExportRequestInput,
  DataExportContent,
  ConsentFormData,
  ConsentCheckResult,
} from '@/types'
import { ConsentStatus, DataAccessType, DataExportStatus } from '@/types/enums'

// Current policy version - should be updated when privacy policy changes
const CURRENT_POLICY_VERSION = '1.0.0'

// Data export deadline in hours (72 hours as per requirement 30.5)
const DATA_EXPORT_DEADLINE_HOURS = 72

// Download link expiry in hours (7 days)
const DOWNLOAD_LINK_EXPIRY_HOURS = 168

/**
 * Map Prisma ConsentRecord to domain type
 */
function mapPrismaConsentRecordToDomain(prismaRecord: {
  id: string
  guardianId: string
  schoolId: string
  status: string
  policyVersion: string
  consentGivenAt: Date | null
  consentWithdrawnAt: Date | null
  withdrawalReason: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  updatedAt: Date
}): ConsentRecord {
  return {
    id: prismaRecord.id,
    guardianId: prismaRecord.guardianId,
    schoolId: prismaRecord.schoolId,
    status: prismaRecord.status as ConsentStatus,
    policyVersion: prismaRecord.policyVersion,
    consentGivenAt: prismaRecord.consentGivenAt ?? undefined,
    consentWithdrawnAt: prismaRecord.consentWithdrawnAt ?? undefined,
    withdrawalReason: prismaRecord.withdrawalReason ?? undefined,
    ipAddress: prismaRecord.ipAddress ?? undefined,
    userAgent: prismaRecord.userAgent ?? undefined,
    createdAt: prismaRecord.createdAt,
    updatedAt: prismaRecord.updatedAt,
  }
}


/**
 * Map Prisma PersonalDataAccessLog to domain type
 */
function mapPrismaAccessLogToDomain(prismaLog: {
  id: string
  guardianId: string
  schoolId: string
  userId: string
  accessType: string
  resourceType: string
  resourceId: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  timestamp: Date
}): PersonalDataAccessLog {
  return {
    id: prismaLog.id,
    guardianId: prismaLog.guardianId,
    schoolId: prismaLog.schoolId,
    userId: prismaLog.userId,
    accessType: prismaLog.accessType as DataAccessType,
    resourceType: prismaLog.resourceType,
    resourceId: prismaLog.resourceId ?? undefined,
    description: prismaLog.description,
    ipAddress: prismaLog.ipAddress ?? undefined,
    userAgent: prismaLog.userAgent ?? undefined,
    timestamp: prismaLog.timestamp,
  }
}

/**
 * Map Prisma DataExportRequest to domain type
 */
function mapPrismaExportRequestToDomain(prismaRequest: {
  id: string
  guardianId: string
  schoolId: string
  status: string
  requestedAt: Date
  dueBy: Date
  completedAt: Date | null
  downloadUrl: string | null
  downloadExpiresAt: Date | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}): DataExportRequest {
  return {
    id: prismaRequest.id,
    guardianId: prismaRequest.guardianId,
    schoolId: prismaRequest.schoolId,
    status: prismaRequest.status as DataExportStatus,
    requestedAt: prismaRequest.requestedAt,
    dueBy: prismaRequest.dueBy,
    completedAt: prismaRequest.completedAt ?? undefined,
    downloadUrl: prismaRequest.downloadUrl ?? undefined,
    downloadExpiresAt: prismaRequest.downloadExpiresAt ?? undefined,
    errorMessage: prismaRequest.errorMessage ?? undefined,
    createdAt: prismaRequest.createdAt,
    updatedAt: prismaRequest.updatedAt,
  }
}

export class ConsentService {
  // ============================================
  // CONSENT FORM PRESENTATION (Requirement 30.1)
  // ============================================

  /**
   * Get consent form data for guardian registration
   * Requirement 30.1: Present consent form on guardian registration
   */
  getConsentFormData(): ConsentFormData {
    return {
      policyVersion: CURRENT_POLICY_VERSION,
      policyText: `
SchoolOffice Privacy Policy

This privacy policy explains how we collect, use, and protect your personal data and your child's educational data.

By providing consent, you agree to the following terms:
      `.trim(),
      dataProcessingPurposes: [
        'Student enrollment and academic record management',
        'Attendance tracking and absence notifications',
        'Fee management and payment processing',
        'Academic performance reporting and report card generation',
        'Communication between school and guardians',
        'Discipline case management and notifications',
      ],
      communicationTypes: [
        'SMS notifications for attendance and urgent matters',
        'WhatsApp messages for detailed reports',
        'Email communications for documents and announcements',
        'In-app notifications for general updates',
      ],
      dataRetentionPeriod: 'Data is retained for the duration of enrollment plus 7 years for academic records',
      thirdPartySharing: [
        'SMS gateway providers for message delivery',
        'Payment processors for fee collection',
        'Cloud storage providers for document storage',
      ],
      guardianRights: [
        'Right to access your personal data and your child\'s educational data',
        'Right to request correction of inaccurate data',
        'Right to request data export within 72 hours',
        'Right to withdraw consent for non-essential communications',
        'Right to lodge a complaint with the data protection authority',
      ],
    }
  }


  // ============================================
  // CONSENT RECORDING (Requirement 30.2)
  // ============================================

  /**
   * Record consent given by guardian
   * Requirement 30.2: Record consent with timestamp and version of privacy policy accepted
   */
  async recordConsent(data: CreateConsentRecordInput): Promise<ConsentRecord> {
    // Check if consent record already exists
    const existingRecord = await prisma.consentRecord.findUnique({
      where: {
        guardianId_schoolId: {
          guardianId: data.guardianId,
          schoolId: data.schoolId,
        },
      },
    })

    if (existingRecord) {
      // Update existing record
      const updatedRecord = await prisma.consentRecord.update({
        where: { id: existingRecord.id },
        data: {
          status: ConsentStatus.GIVEN,
          policyVersion: data.policyVersion,
          consentGivenAt: new Date(),
          consentWithdrawnAt: null,
          withdrawalReason: null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      })

      // Also update the guardian's consent fields
      await prisma.guardian.update({
        where: { id: data.guardianId },
        data: {
          consentGiven: true,
          consentDate: new Date(),
        },
      })

      return mapPrismaConsentRecordToDomain(updatedRecord)
    }

    // Create new consent record
    const consentRecord = await prisma.consentRecord.create({
      data: {
        guardianId: data.guardianId,
        schoolId: data.schoolId,
        status: ConsentStatus.GIVEN,
        policyVersion: data.policyVersion,
        consentGivenAt: new Date(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })

    // Also update the guardian's consent fields
    await prisma.guardian.update({
      where: { id: data.guardianId },
      data: {
        consentGiven: true,
        consentDate: new Date(),
      },
    })

    return mapPrismaConsentRecordToDomain(consentRecord)
  }

  /**
   * Get consent record for a guardian at a school
   */
  async getConsentRecord(guardianId: string, schoolId: string): Promise<ConsentRecord | null> {
    const record = await prisma.consentRecord.findUnique({
      where: {
        guardianId_schoolId: {
          guardianId,
          schoolId,
        },
      },
    })

    if (!record) return null
    return mapPrismaConsentRecordToDomain(record)
  }

  /**
   * Check if guardian has given consent
   * Requirement 30.3: Handle consent withdrawal - check consent status
   */
  async checkConsent(guardianId: string, schoolId: string): Promise<ConsentCheckResult> {
    const record = await this.getConsentRecord(guardianId, schoolId)

    if (!record) {
      return {
        hasConsent: false,
        canReceiveEssentialCommunications: true, // Essential communications always allowed
        canReceiveNonEssentialCommunications: false,
      }
    }

    const hasConsent = record.status === ConsentStatus.GIVEN

    return {
      hasConsent,
      consentRecord: record,
      canReceiveEssentialCommunications: true, // Essential communications always allowed
      canReceiveNonEssentialCommunications: hasConsent,
    }
  }


  // ============================================
  // CONSENT WITHDRAWAL (Requirement 30.3)
  // ============================================

  /**
   * Withdraw consent
   * Requirement 30.3: Handle consent withdrawal - disable non-essential communications
   */
  async withdrawConsent(data: WithdrawConsentInput): Promise<ConsentRecord> {
    const existingRecord = await prisma.consentRecord.findUnique({
      where: {
        guardianId_schoolId: {
          guardianId: data.guardianId,
          schoolId: data.schoolId,
        },
      },
    })

    if (!existingRecord) {
      throw new Error('No consent record found for this guardian and school')
    }

    if (existingRecord.status === ConsentStatus.WITHDRAWN) {
      throw new Error('Consent has already been withdrawn')
    }

    const updatedRecord = await prisma.consentRecord.update({
      where: { id: existingRecord.id },
      data: {
        status: ConsentStatus.WITHDRAWN,
        consentWithdrawnAt: new Date(),
        withdrawalReason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })

    // Update the guardian's consent fields
    await prisma.guardian.update({
      where: { id: data.guardianId },
      data: {
        consentGiven: false,
      },
    })

    return mapPrismaConsentRecordToDomain(updatedRecord)
  }

  // ============================================
  // PERSONAL DATA ACCESS LOGGING (Requirement 30.4)
  // ============================================

  /**
   * Log personal data access
   * Requirement 30.4: Log personal data access in the audit trail
   */
  async logDataAccess(data: CreatePersonalDataAccessLogInput): Promise<PersonalDataAccessLog> {
    const accessLog = await prisma.personalDataAccessLog.create({
      data: {
        guardianId: data.guardianId,
        schoolId: data.schoolId,
        userId: data.userId,
        accessType: data.accessType,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
      },
    })

    return mapPrismaAccessLogToDomain(accessLog)
  }

  /**
   * Get data access logs for a guardian
   */
  async getDataAccessLogs(
    guardianId: string,
    schoolId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<PersonalDataAccessLog[]> {
    const logs = await prisma.personalDataAccessLog.findMany({
      where: {
        guardianId,
        schoolId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return logs.map(mapPrismaAccessLogToDomain)
  }

  /**
   * Get data access logs by access type
   */
  async getDataAccessLogsByType(
    guardianId: string,
    schoolId: string,
    accessType: DataAccessType,
    limit: number = 100
  ): Promise<PersonalDataAccessLog[]> {
    const logs = await prisma.personalDataAccessLog.findMany({
      where: {
        guardianId,
        schoolId,
        accessType,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return logs.map(mapPrismaAccessLogToDomain)
  }


  // ============================================
  // DATA EXPORT (Requirement 30.5)
  // ============================================

  /**
   * Request data export
   * Requirement 30.5: Generate data export within 72 hours
   */
  async requestDataExport(data: CreateDataExportRequestInput): Promise<DataExportRequest> {
    // Check for existing pending request
    const existingRequest = await prisma.dataExportRequest.findFirst({
      where: {
        guardianId: data.guardianId,
        schoolId: data.schoolId,
        status: { in: [DataExportStatus.PENDING, DataExportStatus.PROCESSING] },
      },
    })

    if (existingRequest) {
      throw new Error('A data export request is already in progress')
    }

    const now = new Date()
    const dueBy = new Date(now.getTime() + DATA_EXPORT_DEADLINE_HOURS * 60 * 60 * 1000)

    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        guardianId: data.guardianId,
        schoolId: data.schoolId,
        status: DataExportStatus.PENDING,
        requestedAt: now,
        dueBy,
      },
    })

    // Log the data export request
    await this.logDataAccess({
      guardianId: data.guardianId,
      schoolId: data.schoolId,
      userId: data.guardianId, // Guardian requesting their own data
      accessType: DataAccessType.EXPORT,
      resource: "data_export",
      description: 'Data export requested',
    })

    return mapPrismaExportRequestToDomain(exportRequest)
  }

  /**
   * Get data export request by ID
   */
  async getDataExportRequest(requestId: string): Promise<DataExportRequest | null> {
    const request = await prisma.dataExportRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) return null
    return mapPrismaExportRequestToDomain(request)
  }

  /**
   * Get pending data export requests for a school
   */
  async getPendingExportRequests(schoolId: string): Promise<DataExportRequest[]> {
    const requests = await prisma.dataExportRequest.findMany({
      where: {
        schoolId,
        status: { in: [DataExportStatus.PENDING, DataExportStatus.PROCESSING] },
      },
      orderBy: { dueBy: 'asc' },
    })

    return requests.map(mapPrismaExportRequestToDomain)
  }

  /**
   * Process data export request - generate the export content
   * Requirement 30.5: Generate complete export of guardian's and student's data
   */
  async processDataExport(requestId: string): Promise<DataExportContent> {
    const request = await prisma.dataExportRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      throw new Error('Data export request not found')
    }

    // Update status to processing
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: DataExportStatus.PROCESSING },
    })

    try {
      // Get guardian data
      const guardian = await prisma.guardian.findUnique({
        where: { id: request.guardianId },
      })

      if (!guardian) {
        throw new Error('Guardian not found')
      }

      // Get linked students
      const studentGuardians = await prisma.studentGuardian.findMany({
        where: { guardianId: request.guardianId },
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      })

      const studentIds = studentGuardians.map(sg => sg.studentId)

      // Get attendance records
      const attendance = await prisma.attendance.findMany({
        where: { studentId: { in: studentIds } },
        include: { student: true },
        orderBy: { date: 'desc' },
        take: 500, // Limit to recent records
      })

      // Get results
      const results = await prisma.result.findMany({
        where: { studentId: { in: studentIds } },
        include: {
          student: true,
          term: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Get payments
      const payments = await prisma.payment.findMany({
        where: { studentId: { in: studentIds } },
        include: {
          student: true,
          term: true,
        },
        orderBy: { receivedAt: 'desc' },
      })

      // Get messages
      const messages = await prisma.message.findMany({
        where: { guardianId: request.guardianId },
        include: { student: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })

      // Get discipline cases
      const disciplineCases = await prisma.disciplineCase.findMany({
        where: { studentId: { in: studentIds } },
        include: { student: true },
        orderBy: { incidentDate: 'desc' },
      })

      // Get consent record
      const consentRecord = await this.getConsentRecord(request.guardianId, request.schoolId)

      // Build export content
      const exportContent: DataExportContent = {
        guardian: {
          id: guardian.id,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          phone: guardian.phone,
          email: guardian.email ?? undefined,
          relationship: guardian.relationship,
          preferredChannel: guardian.preferredChannel,
          consentGiven: guardian.consentGiven,
          consentDate: guardian.consentDate ?? undefined,
          createdAt: guardian.createdAt,
        },
        students: studentGuardians.map(sg => ({
          id: sg.student.id,
          admissionNumber: sg.student.admissionNumber,
          firstName: sg.student.firstName,
          lastName: sg.student.lastName,
          dateOfBirth: sg.student.dateOfBirth ?? undefined,
          gender: sg.student.gender ?? undefined,
          className: sg.student.class.name,
          streamName: sg.student.stream?.name,
          enrollmentDate: sg.student.enrollmentDate,
          status: sg.student.status,
        })),
        attendance: attendance.map(a => ({
          studentName: `${a.student.firstName} ${a.student.lastName}`,
          date: a.date,
          period: a.period,
          status: a.status,
          remarks: a.remarks ?? undefined,
        })),
        results: results.map(r => ({
          studentName: `${r.student.firstName} ${r.student.lastName}`,
          termName: r.term.name,
          totalMarks: r.totalMarks,
          average: r.average,
          position: r.position,
          grade: r.grade ?? undefined,
        })),
        payments: payments.map(p => ({
          studentName: `${p.student.firstName} ${p.student.lastName}`,
          termName: p.term.name,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          receiptNumber: p.receiptNumber,
          receivedAt: p.receivedAt,
        })),
        messages: messages.map(m => ({
          studentName: `${m.student.firstName} ${m.student.lastName}`,
          channel: m.channel,
          content: m.content,
          status: m.status,
          sentAt: m.sentAt ?? undefined,
        })),
        disciplineCases: disciplineCases.map(dc => ({
          studentName: `${dc.student.firstName} ${dc.student.lastName}`,
          incidentDate: dc.incidentDate,
          description: dc.description,
          type: dc.type,
          action: dc.action,
        })),
        exportedAt: new Date(),
        policyVersion: consentRecord?.policyVersion ?? CURRENT_POLICY_VERSION,
      }

      return exportContent
    } catch (error) {
      // Update status to failed
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: DataExportStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      throw error
    }
  }


  /**
   * Complete data export request with download URL
   */
  async completeDataExport(requestId: string, downloadUrl: string): Promise<DataExportRequest> {
    const now = new Date()
    const downloadExpiresAt = new Date(now.getTime() + DOWNLOAD_LINK_EXPIRY_HOURS * 60 * 60 * 1000)

    const updatedRequest = await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: DataExportStatus.COMPLETED,
        completedAt: now,
        downloadUrl,
        downloadExpiresAt,
      },
    })

    return mapPrismaExportRequestToDomain(updatedRequest)
  }

  /**
   * Mark expired export requests
   */
  async markExpiredExports(): Promise<number> {
    const now = new Date()

    // Mark download links as expired
    const expiredDownloads = await prisma.dataExportRequest.updateMany({
      where: {
        status: DataExportStatus.COMPLETED,
        downloadExpiresAt: { lt: now },
      },
      data: {
        status: DataExportStatus.EXPIRED,
        downloadUrl: null,
      },
    })

    // Mark overdue pending requests as failed
    const overdueRequests = await prisma.dataExportRequest.updateMany({
      where: {
        status: { in: [DataExportStatus.PENDING, DataExportStatus.PROCESSING] },
        dueBy: { lt: now },
      },
      data: {
        status: DataExportStatus.FAILED,
        errorMessage: 'Export request exceeded 72-hour deadline',
      },
    })

    return expiredDownloads.count + overdueRequests.count
  }

  /**
   * Get export requests for a guardian
   */
  async getGuardianExportRequests(guardianId: string): Promise<DataExportRequest[]> {
    const requests = await prisma.dataExportRequest.findMany({
      where: { guardianId },
      orderBy: { requestedAt: 'desc' },
    })

    return requests.map(mapPrismaExportRequestToDomain)
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get current policy version
   */
  getCurrentPolicyVersion(): string {
    return CURRENT_POLICY_VERSION
  }

  /**
   * Check if guardian needs to re-consent (policy version changed)
   */
  async needsReConsent(guardianId: string, schoolId: string): Promise<boolean> {
    const record = await this.getConsentRecord(guardianId, schoolId)

    if (!record) return true
    if (record.status !== ConsentStatus.GIVEN) return true
    if (record.policyVersion !== CURRENT_POLICY_VERSION) return true

    return false
  }

  /**
   * Get all guardians who need to re-consent for a school
   */
  async getGuardiansNeedingReConsent(schoolId: string): Promise<string[]> {
    // Get all guardians linked to students in this school
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        student: { schoolId },
      },
      select: { guardianId: true },
      distinct: ['guardianId'],
    })

    const guardianIds = studentGuardians.map(sg => sg.guardianId)

    // Get consent records for these guardians
    const consentRecords = await prisma.consentRecord.findMany({
      where: {
        guardianId: { in: guardianIds },
        schoolId,
      },
    })

    const consentMap = new Map(consentRecords.map(r => [r.guardianId, r]))

    // Find guardians who need re-consent
    const needsReConsent: string[] = []
    for (const guardianId of guardianIds) {
      const record = consentMap.get(guardianId)
      if (!record || record.status !== ConsentStatus.GIVEN || record.policyVersion !== CURRENT_POLICY_VERSION) {
        needsReConsent.push(guardianId)
      }
    }

    return needsReConsent
  }

  /**
   * Get consent statistics for a school
   */
  async getConsentStatistics(schoolId: string): Promise<{
    totalGuardians: number
    consentGiven: number
    consentPending: number
    consentWithdrawn: number
    needsReConsent: number
  }> {
    // Get all guardians linked to students in this school
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        student: { schoolId },
      },
      select: { guardianId: true },
      distinct: ['guardianId'],
    })

    const totalGuardians = studentGuardians.length
    const guardianIds = studentGuardians.map(sg => sg.guardianId)

    // Get consent records
    const consentRecords = await prisma.consentRecord.findMany({
      where: {
        guardianId: { in: guardianIds },
        schoolId,
      },
    })

    let consentGiven = 0
    let consentWithdrawn = 0
    let needsReConsent = 0

    for (const record of consentRecords) {
      if (record.status === ConsentStatus.GIVEN) {
        if (record.policyVersion === CURRENT_POLICY_VERSION) {
          consentGiven++
        } else {
          needsReConsent++
        }
      } else if (record.status === ConsentStatus.WITHDRAWN) {
        consentWithdrawn++
      }
    }

    const consentPending = totalGuardians - consentGiven - consentWithdrawn - needsReConsent

    return {
      totalGuardians,
      consentGiven,
      consentPending,
      consentWithdrawn,
      needsReConsent,
    }
  }
}

// Export singleton instance
export const consentService = new ConsentService()
