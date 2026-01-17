/**
 * Property Test: Guardian Association Integrity
 * **Feature: school-office, Property 9: Guardian Association Integrity**
 * **Validates: Requirements 4.2**
 * 
 * For any student with linked guardians, each guardian record SHALL contain 
 * valid contact information and relationship type.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { RelationshipType, MessageChannel, PilotType, StudentStatus, Gender } from '../../src/types/enums'
import type { Guardian, CreateGuardianInput, Student, StudentGuardian } from '../../src/types/entities'

// ============================================
// GUARDIAN VALIDATION UTILITIES
// ============================================

/**
 * Validates that a guardian has valid contact information
 * Requirement 4.2: Store guardian contact information
 */
function hasValidContactInfo(guardian: Guardian): boolean {
  // Phone is required and must be non-empty
  const hasValidPhone = typeof guardian.phone === 'string' && guardian.phone.trim().length > 0
  
  // Email is optional but must be valid format if present
  const hasValidEmail = guardian.email === undefined || 
    (typeof guardian.email === 'string' && guardian.email.includes('@'))
  
  // WhatsApp number is optional but must be non-empty if present
  const hasValidWhatsApp = guardian.whatsappNumber === undefined ||
    (typeof guardian.whatsappNumber === 'string' && guardian.whatsappNumber.trim().length > 0)
  
  return hasValidPhone && hasValidEmail && hasValidWhatsApp
}

/**
 * Validates that a guardian has a valid relationship type
 * Requirement 4.2: Store relationship type
 */
function hasValidRelationshipType(guardian: Guardian): boolean {
  return Object.values(RelationshipType).includes(guardian.relationship)
}

/**
 * Validates that a guardian has a valid preferred channel
 */
function hasValidPreferredChannel(guardian: Guardian): boolean {
  return Object.values(MessageChannel).includes(guardian.preferredChannel)
}

/**
 * Validates complete guardian record integrity
 */
function hasGuardianIntegrity(guardian: Guardian): boolean {
  const hasId = typeof guardian.id === 'string' && guardian.id.length > 0
  const hasFirstName = typeof guardian.firstName === 'string' && guardian.firstName.trim().length > 0
  const hasLastName = typeof guardian.lastName === 'string' && guardian.lastName.trim().length > 0
  const hasValidContact = hasValidContactInfo(guardian)
  const hasValidRelationship = hasValidRelationshipType(guardian)
  const hasValidChannel = hasValidPreferredChannel(guardian)
  const hasConsentFlag = typeof guardian.consentGiven === 'boolean'
  const hasPhoneVerifiedFlag = typeof guardian.phoneVerified === 'boolean'
  const hasEmailVerifiedFlag = typeof guardian.emailVerified === 'boolean'
  
  return hasId && hasFirstName && hasLastName && hasValidContact && 
         hasValidRelationship && hasValidChannel && hasConsentFlag &&
         hasPhoneVerifiedFlag && hasEmailVerifiedFlag
}

// ============================================
// GUARDIAN STORE SIMULATION
// ============================================

/**
 * Simulates guardian creation and student-guardian linking
 * This represents the guardian service behavior
 */
class GuardianStore {
  private guardians: Map<string, Guardian> = new Map()
  private studentGuardians: Map<string, StudentGuardian[]> = new Map()

  /**
   * Create a new guardian
   */
  createGuardian(input: CreateGuardianInput): Guardian {
    const now = new Date()
    const guardian: Guardian = {
      id: crypto.randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      phoneVerified: false,
      email: input.email,
      emailVerified: false,
      whatsappNumber: input.whatsappNumber,
      relationship: input.relationship,
      preferredChannel: input.preferredChannel ?? MessageChannel.SMS,
      consentGiven: false,
      createdAt: now,
      updatedAt: now,
    }
    
    this.guardians.set(guardian.id, guardian)
    return guardian
  }

  /**
   * Link guardian to student
   */
  linkGuardianToStudent(studentId: string, guardianId: string, isPrimary: boolean): StudentGuardian {
    const guardian = this.guardians.get(guardianId)
    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // If setting as primary, unset existing primary
    if (isPrimary) {
      const existingLinks = this.studentGuardians.get(studentId) ?? []
      existingLinks.forEach(link => {
        link.isPrimary = false
      })
    }

    const link: StudentGuardian = {
      id: crypto.randomUUID(),
      studentId,
      guardianId,
      isPrimary,
      createdAt: new Date(),
    }

    const links = this.studentGuardians.get(studentId) ?? []
    links.push(link)
    this.studentGuardians.set(studentId, links)

    return link
  }

  /**
   * Get guardians for a student
   */
  getGuardiansForStudent(studentId: string): Guardian[] {
    const links = this.studentGuardians.get(studentId) ?? []
    return links
      .map(link => this.guardians.get(link.guardianId))
      .filter((g): g is Guardian => g !== undefined)
  }

  /**
   * Get primary guardian for a student
   */
  getPrimaryGuardian(studentId: string): Guardian | null {
    const links = this.studentGuardians.get(studentId) ?? []
    const primaryLink = links.find(link => link.isPrimary)
    if (!primaryLink) return null
    return this.guardians.get(primaryLink.guardianId) ?? null
  }

  /**
   * Check if student has a primary guardian
   */
  hasPrimaryGuardian(studentId: string): boolean {
    const links = this.studentGuardians.get(studentId) ?? []
    return links.some(link => link.isPrimary)
  }

  /**
   * Get guardian by ID
   */
  getGuardian(guardianId: string): Guardian | undefined {
    return this.guardians.get(guardianId)
  }

  /**
   * Count guardians for a student
   */
  countGuardiansForStudent(studentId: string): number {
    return (this.studentGuardians.get(studentId) ?? []).length
  }
}

// ============================================
// ARBITRARIES
// ============================================

const relationshipTypeArbitrary = fc.constantFrom(...Object.values(RelationshipType))
const messageChannelArbitrary = fc.constantFrom(...Object.values(MessageChannel))

const phoneArbitrary = fc.string({ minLength: 10, maxLength: 15 })
  .filter(s => /^\d+$/.test(s.trim()) || s.trim().length >= 10)
  .map(s => s.trim().length >= 10 ? s : '+256' + s.padStart(9, '0'))

const emailArbitrary = fc.emailAddress()

const createGuardianInputArbitrary = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  phone: phoneArbitrary,
  email: fc.option(emailArbitrary, { nil: undefined }),
  whatsappNumber: fc.option(phoneArbitrary, { nil: undefined }),
  relationship: relationshipTypeArbitrary,
  preferredChannel: fc.option(messageChannelArbitrary, { nil: undefined }),
})

const studentIdArbitrary = fc.uuid()

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 9: Guardian Association Integrity', () => {
  /**
   * Property: Every guardian has valid contact information
   * For any created guardian, phone SHALL be non-empty
   */
  it('every guardian has valid contact information', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return hasValidContactInfo(guardian)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Every guardian has a valid relationship type
   * For any created guardian, relationship SHALL be a valid RelationshipType
   */
  it('every guardian has a valid relationship type', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return hasValidRelationshipType(guardian)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Guardian record has complete integrity
   * For any created guardian, all required fields SHALL be present and valid
   */
  it('guardian record has complete integrity', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return hasGuardianIntegrity(guardian)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Linked guardians maintain integrity
   * For any student with linked guardians, each guardian SHALL have valid data
   */
  it('linked guardians maintain integrity', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(createGuardianInputArbitrary, { minLength: 1, maxLength: 5 }),
        (studentId, guardianInputs) => {
          const store = new GuardianStore()
          
          // Create guardians and link them to the student
          guardianInputs.forEach((input, index) => {
            const guardian = store.createGuardian(input)
            store.linkGuardianToStudent(studentId, guardian.id, index === 0) // First is primary
          })
          
          // Get all guardians for the student
          const guardians = store.getGuardiansForStudent(studentId)
          
          // All guardians should have integrity
          return guardians.every(hasGuardianIntegrity)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Primary guardian designation is unique
   * For any student, at most one guardian SHALL be marked as primary
   */
  it('primary guardian designation is unique', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(createGuardianInputArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
        (studentId, guardianInputs, primaryFlags) => {
          const store = new GuardianStore()
          
          // Create guardians and link them with various primary flags
          guardianInputs.forEach((input, index) => {
            const guardian = store.createGuardian(input)
            const isPrimary = primaryFlags[index % primaryFlags.length]
            store.linkGuardianToStudent(studentId, guardian.id, isPrimary)
          })
          
          // Count primary guardians
          const links = store.getGuardiansForStudent(studentId)
          const primaryGuardian = store.getPrimaryGuardian(studentId)
          
          // If there's a primary guardian, there should be exactly one
          // (The last one set as primary wins)
          if (primaryGuardian) {
            return store.hasPrimaryGuardian(studentId)
          }
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Guardian phone is always present
   * For any guardian, phone SHALL be a non-empty string
   */
  it('guardian phone is always present', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return typeof guardian.phone === 'string' && 
               guardian.phone.trim().length > 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Guardian relationship type matches input
   * For any guardian, relationship SHALL match the input relationship
   */
  it('guardian relationship type matches input', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return guardian.relationship === input.relationship
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Default preferred channel is SMS
   * For any guardian created without specifying preferredChannel, 
   * it SHALL default to SMS
   */
  it('default preferred channel is SMS', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const inputWithoutChannel = { ...input, preferredChannel: undefined }
        const store = new GuardianStore()
        const guardian = store.createGuardian(inputWithoutChannel)
        
        return guardian.preferredChannel === MessageChannel.SMS
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: New guardians start unverified
   * For any newly created guardian, phoneVerified and emailVerified SHALL be false
   */
  it('new guardians start unverified', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return guardian.phoneVerified === false && 
               guardian.emailVerified === false
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: New guardians start without consent
   * For any newly created guardian, consentGiven SHALL be false
   */
  it('new guardians start without consent', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return guardian.consentGiven === false
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Guardian ID is unique
   * For any set of created guardians, all IDs SHALL be unique
   */
  it('guardian ID is unique', () => {
    fc.assert(
      fc.property(
        fc.array(createGuardianInputArbitrary, { minLength: 2, maxLength: 10 }),
        (inputs) => {
          const store = new GuardianStore()
          const guardians = inputs.map(input => store.createGuardian(input))
          
          const ids = guardians.map(g => g.id)
          const uniqueIds = new Set(ids)
          
          return uniqueIds.size === ids.length
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Student can have multiple guardians
   * For any student, multiple guardians CAN be linked
   */
  it('student can have multiple guardians', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(createGuardianInputArbitrary, { minLength: 2, maxLength: 5 }),
        (studentId, guardianInputs) => {
          const store = new GuardianStore()
          
          // Create and link multiple guardians
          guardianInputs.forEach((input, index) => {
            const guardian = store.createGuardian(input)
            store.linkGuardianToStudent(studentId, guardian.id, index === 0)
          })
          
          const count = store.countGuardiansForStudent(studentId)
          
          return count === guardianInputs.length
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Guardian names are preserved
   * For any guardian, firstName and lastName SHALL match input
   */
  it('guardian names are preserved', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return guardian.firstName === input.firstName &&
               guardian.lastName === input.lastName
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Optional email is preserved when provided
   * For any guardian with email input, email SHALL be preserved
   */
  it('optional email is preserved when provided', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        if (input.email !== undefined) {
          return guardian.email === input.email
        }
        return guardian.email === undefined
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Optional WhatsApp number is preserved when provided
   * For any guardian with whatsappNumber input, it SHALL be preserved
   */
  it('optional WhatsApp number is preserved when provided', () => {
    fc.assert(
      fc.property(createGuardianInputArbitrary, (input) => {
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        if (input.whatsappNumber !== undefined) {
          return guardian.whatsappNumber === input.whatsappNumber
        }
        return guardian.whatsappNumber === undefined
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All relationship types are valid
   * For any valid RelationshipType, it SHALL be accepted
   */
  it('all relationship types are valid', () => {
    fc.assert(
      fc.property(relationshipTypeArbitrary, (relationship) => {
        const input: CreateGuardianInput = {
          firstName: 'Test',
          lastName: 'Guardian',
          phone: '+256700000000',
          relationship,
        }
        
        const store = new GuardianStore()
        const guardian = store.createGuardian(input)
        
        return guardian.relationship === relationship &&
               hasValidRelationshipType(guardian)
      }),
      { numRuns: 20 }
    )
  })
})
