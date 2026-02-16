/**
 * Contact Management Service
 * Handles contact information management, validation, and reporting
 * Requirements: 16.1, 16.2, 16.4, 16.5, 16.6
 */  
import { prisma } from '@/lib/db'
import {
  StudentContacts,
  GuardianContact,
  ContactValidation,
  DuplicateReport,
  MissingContactReport,
} from '@/types'
import { MessageChannel } from '@/types/enums'
import { IContactManagementService } from '@/types/services'

/**
 * Uganda phone number regex pattern
 * Supports formats: +256XXXXXXXXX, 256XXXXXXXXX, 0XXXXXXXXX
 */
const UGANDA_PHONE_REGEX = /^(?:\+?256|0)?[37]\d{8}$/

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Format phone number to standard Uganda format (+256XXXXXXXXX)
 */
function formatUgandaPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Handle different formats
  if (cleaned.startsWith('+256')) {
    return cleaned
  } else if (cleaned.startsWith('256')) {
    return '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    return '+256' + cleaned.substring(1)
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('3'))) {
    return '+256' + cleaned
  }
  
  return cleaned
}

/**
 * Map Prisma Guardian to GuardianContact type
 */
function mapToGuardianContact(
  guardian: {
    id: string
    firstName: string
    lastName: string
    phone: string
    phoneVerified: boolean
    email: string | null
    emailVerified: boolean
    whatsappNumber: string | null
    preferredChannel: string
  },
  isPrimary: boolean
): GuardianContact {
  return {
    guardianId: guardian.id,
    name: `${guardian.firstName} ${guardian.lastName}`,
    phone: guardian.phone || undefined,
    phoneVerified: guardian.phoneVerified,
    email: guardian.email || undefined,
    emailVerified: guardian.emailVerified,
    whatsappNumber: guardian.whatsappNumber || undefined,
    preferredChannel: guardian.preferredChannel as MessageChannel,
    isPrimary,
  }
}

export class ContactManagementService implements IContactManagementService {
  /**
   * Get all contacts for a student including guardians
   * Requirement 16.1: Associate each student with their guardian contact(s)
   * Requirement 16.2: Support multiple guardians per student with priority ordering
   */
  async getStudentContacts(studentId: string): Promise<StudentContacts> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { studentId },
      include: { guardian: true },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    const guardians: GuardianContact[] = studentGuardians.map(sg =>
      mapToGuardianContact(sg.guardian, sg.isPrimary)
    )

    const primaryGuardian = guardians.find(g => g.isPrimary)

    return {
      studentId,
      guardians,
      primaryGuardian,
    }
  }

  /**
   * Get contact information for a specific guardian
   */
  async getGuardianContacts(guardianId: string): Promise<GuardianContact> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Check if this guardian is primary for any student
    const primaryLink = await prisma.studentGuardian.findFirst({
      where: {
        guardianId,
        isPrimary: true,
      },
    })

    return mapToGuardianContact(guardian, !!primaryLink)
  }


  /**
   * Validate a contact (phone, email, or whatsapp)
   * Requirement 16.6: Validate contact information before delivery attempt
   */
  async validateContact(
    contact: string,
    type: 'phone' | 'email' | 'whatsapp'
  ): Promise<ContactValidation> {
    if (!contact || contact.trim().length === 0) {
      return {
        valid: false,
        error: 'Contact cannot be empty',
      }
    }

    const trimmedContact = contact.trim()

    switch (type) {
      case 'phone':
      case 'whatsapp':
        return this.validatePhoneNumber(trimmedContact)
      case 'email':
        return this.validateEmail(trimmedContact)
      default:
        return {
          valid: false,
          error: `Unknown contact type: ${type}`,
        }
    }
  }

  /**
   * Validate phone number (Uganda format)
   */
  private validatePhoneNumber(phone: string): ContactValidation {
    // Remove spaces and dashes for validation
    const cleaned = phone.replace(/[\s-]/g, '')
    
    // Check if it matches Uganda phone format
    if (!UGANDA_PHONE_REGEX.test(cleaned)) {
      const suggestions: string[] = []
      
      // Try to provide helpful suggestions
      if (cleaned.length < 9) {
        suggestions.push('Phone number appears too short')
      } else if (cleaned.length > 13) {
        suggestions.push('Phone number appears too long')
      }
      
      if (!cleaned.match(/^[+\d]/)) {
        suggestions.push('Phone number should start with + or a digit')
      }

      return {
        valid: false,
        error: 'Invalid Uganda phone number format',
        suggestions: suggestions.length > 0 ? suggestions : ['Expected format: +256XXXXXXXXX or 0XXXXXXXXX'],
      }
    }

    // Format to standard format
    const formatted = formatUgandaPhone(cleaned)

    return {
      valid: true,
      formatted,
    }
  }

  /**
   * Validate email address
   */
  private validateEmail(email: string): ContactValidation {
    if (!EMAIL_REGEX.test(email)) {
      return {
        valid: false,
        error: 'Invalid email address format',
        suggestions: ['Expected format: user@domain.com'],
      }
    }

    return {
      valid: true,
      formatted: email.toLowerCase(),
    }
  }

  /**
   * Resolve contact information for a specific channel
   * Requirement 16.6: Validate contact information before delivery attempt
   */
  async resolveContactForChannel(
    recipientId: string,
    channel: MessageChannel
  ): Promise<string | null> {
    // First try to find as guardian
    const guardian = await prisma.guardian.findUnique({
      where: { id: recipientId },
    })

    if (guardian) {
      return this.getContactFromGuardian(guardian, channel)
    }

    // Try to find as student (get primary guardian's contact)
    const student = await prisma.student.findUnique({
      where: { id: recipientId },
    })

    if (student) {
      const primaryGuardianLink = await prisma.studentGuardian.findFirst({
        where: {
          studentId: recipientId,
          isPrimary: true,
        },
        include: { guardian: true },
      })

      if (primaryGuardianLink) {
        return this.getContactFromGuardian(primaryGuardianLink.guardian, channel)
      }

      // Fall back to any guardian if no primary
      const anyGuardianLink = await prisma.studentGuardian.findFirst({
        where: { studentId: recipientId },
        include: { guardian: true },
      })

      if (anyGuardianLink) {
        return this.getContactFromGuardian(anyGuardianLink.guardian, channel)
      }
    }

    // Try to find as staff
    const staff = await prisma.staff.findUnique({
      where: { id: recipientId },
    })

    if (staff) {
      switch (channel) {
        case MessageChannel.SMS:
          return staff.phone || null
        case MessageChannel.EMAIL:
          return staff.email || null
        case MessageChannel.WHATSAPP:
          return staff.phone || null // Use phone for WhatsApp
        default:
          return null
      }
    }

    return null
  }

  /**
   * Get contact from guardian based on channel
   */
  private getContactFromGuardian(
    guardian: {
      phone: string
      email: string | null
      whatsappNumber: string | null
    },
    channel: MessageChannel
  ): string | null {
    switch (channel) {
      case MessageChannel.SMS:
        return guardian.phone || null
      case MessageChannel.EMAIL:
        return guardian.email || null
      case MessageChannel.WHATSAPP:
        return guardian.whatsappNumber || guardian.phone || null
      default:
        return null
    }
  }


  /**
   * Detect duplicate contacts in a school
   * Requirement 16.4: Detect and flag duplicate contacts
   */
  async detectDuplicates(schoolId: string): Promise<DuplicateReport> {
    // Get all guardians linked to students in this school
    const guardians = await prisma.guardian.findMany({
      where: {
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
      },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    })

    const phoneDuplicates = new Map<string, string[]>()
    const emailDuplicates = new Map<string, string[]>()

    // Group guardians by phone
    for (const guardian of guardians) {
      if (guardian.phone) {
        const normalizedPhone = formatUgandaPhone(guardian.phone)
        const existing = phoneDuplicates.get(normalizedPhone) || []
        existing.push(guardian.id)
        phoneDuplicates.set(normalizedPhone, existing)
      }

      if (guardian.email) {
        const normalizedEmail = guardian.email.toLowerCase()
        const existing = emailDuplicates.get(normalizedEmail) || []
        existing.push(guardian.id)
        emailDuplicates.set(normalizedEmail, existing)
      }
    }

    // Filter to only include actual duplicates (more than one guardian)
    const duplicates: DuplicateReport['duplicates'] = []

    for (const [phone, guardianIds] of phoneDuplicates) {
      if (guardianIds.length > 1) {
        duplicates.push({
          contact: phone,
          type: 'phone',
          guardianIds,
        })
      }
    }

    for (const [email, guardianIds] of emailDuplicates) {
      if (guardianIds.length > 1) {
        duplicates.push({
          contact: email,
          type: 'email',
          guardianIds,
        })
      }
    }

    return {
      schoolId,
      duplicates,
    }
  }

  /**
   * Get report of missing contact information
   * Requirement 16.5: Identify and report missing contact information
   */
  async getMissingContacts(schoolId: string): Promise<MissingContactReport> {
    // Find students without any guardians
    const studentsWithoutGuardians = await prisma.student.findMany({
      where: {
        schoolId,
        studentGuardians: {
          none: {},
        },
      },
      select: { id: true },
    })

    // Get all guardians linked to students in this school
    const guardians = await prisma.guardian.findMany({
      where: {
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
      },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    })

    // Find guardians without phone
    const guardiansWithoutPhone = guardians
      .filter(g => !g.phone || g.phone.trim().length === 0)
      .map(g => g.id)

    // Find guardians without email
    const guardiansWithoutEmail = guardians
      .filter(g => !g.email || g.email.trim().length === 0)
      .map(g => g.id)

    return {
      schoolId,
      studentsWithoutGuardians: studentsWithoutGuardians.map(s => s.id),
      guardiansWithoutPhone,
      guardiansWithoutEmail,
    }
  }

  /**
   * Update contact information for a guardian
   */
  async updateGuardianContact(
    guardianId: string,
    updates: {
      phone?: string
      email?: string
      whatsappNumber?: string
    }
  ): Promise<void> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const updateData: Record<string, unknown> = {}

    if (updates.phone !== undefined) {
      const validation = await this.validateContact(updates.phone, 'phone')
      if (!validation.valid) {
        throw new Error(`Invalid phone number: ${validation.error}`)
      }
      updateData.phone = validation.formatted
      updateData.phoneVerified = false // Reset verification on change
    }

    if (updates.email !== undefined) {
      const validation = await this.validateContact(updates.email, 'email')
      if (!validation.valid) {
        throw new Error(`Invalid email: ${validation.error}`)
      }
      updateData.email = validation.formatted
      updateData.emailVerified = false // Reset verification on change
    }

    if (updates.whatsappNumber !== undefined) {
      const validation = await this.validateContact(updates.whatsappNumber, 'whatsapp')
      if (!validation.valid) {
        throw new Error(`Invalid WhatsApp number: ${validation.error}`)
      }
      updateData.whatsappNumber = validation.formatted
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.guardian.update({
        where: { id: guardianId },
        data: updateData,
      })
    }
  }

  /**
   * Check if a student has at least one guardian with valid contact
   */
  async hasValidContact(studentId: string, channel: MessageChannel): Promise<boolean> {
    const contacts = await this.getStudentContacts(studentId)
    
    for (const guardian of contacts.guardians) {
      const contact = await this.resolveContactForChannel(guardian.guardianId, channel)
      if (contact) {
        const validation = await this.validateContact(
          contact,
          channel === MessageChannel.EMAIL ? 'email' : 'phone'
        )
        if (validation.valid) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Get all students in a school with their contact status
   */
  async getContactStatusForSchool(schoolId: string): Promise<{
    studentId: string
    hasGuardian: boolean
    hasPrimaryGuardian: boolean
    hasPhone: boolean
    hasEmail: boolean
    hasWhatsApp: boolean
  }[]> {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        studentGuardians: {
          include: { guardian: true },
        },
      },
    })

    return students.map(student => {
      const guardians = student.studentGuardians.map(sg => sg.guardian)
      const hasPrimary = student.studentGuardians.some(sg => sg.isPrimary)

      return {
        studentId: student.id,
        hasGuardian: guardians.length > 0,
        hasPrimaryGuardian: hasPrimary,
        hasPhone: guardians.some(g => g.phone && g.phone.trim().length > 0),
        hasEmail: guardians.some(g => g.email && g.email.trim().length > 0),
        hasWhatsApp: guardians.some(g => 
          (g.whatsappNumber && g.whatsappNumber.trim().length > 0) ||
          (g.phone && g.phone.trim().length > 0)
        ),
      }
    })
  }
}

// Export singleton instance
export const contactManagementService = new ContactManagementService()
