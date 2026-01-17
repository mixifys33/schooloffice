/**
 * Guardian Data Quality Service
 * Handles data quality validation, duplicate detection, and merge suggestions
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
import { prisma } from '@/lib/db'
import {
  DataQualityIssue,
  DataQualityIssueType,
  DataQualityIssueSeverity,
  GuardianDataQualityResult,
  DuplicateGuardianMatch,
  DuplicateDetectionResult,
  GuardianMergeSuggestion,
  DuplicateDetectionOptions,
  SchoolGuardianDataQualitySummary,
} from '@/types'
import { validatePhoneNumber } from './guardian.service'

/**
 * Calculate Levenshtein distance between two strings
 * Used for name similarity comparison
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  
  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        )
      }
    }
  }
  
  return dp[m][n]
}

/**
 * Calculate name similarity score (0-1)
 * Higher score means more similar
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = name1.toLowerCase().trim()
  const normalized2 = name2.toLowerCase().trim()
  
  if (normalized1 === normalized2) return 1.0
  if (normalized1.length === 0 || normalized2.length === 0) return 0.0
  
  const distance = levenshteinDistance(normalized1, normalized2)
  const maxLength = Math.max(normalized1.length, normalized2.length)
  
  return 1 - (distance / maxLength)
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters except leading +
 */
function normalizePhone(phone: string): string {
  const hasPlus = phone.startsWith('+')
  const digits = phone.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export class GuardianDataQualityService {
  /**
   * Default minimum name similarity threshold for duplicate detection
   */
  private readonly DEFAULT_NAME_SIMILARITY_THRESHOLD = 0.8

  /**
   * Assess data quality for a single guardian
   * Requirement 8.3: Validate phone numbers against expected formats
   * Requirement 8.4: Flag guardian profiles with missing critical contact information
   * Requirement 8.5: Display data quality indicators
   */
  async assessGuardianQuality(guardianId: string): Promise<GuardianDataQualityResult> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const issues: DataQualityIssue[] = []

    // Check for missing critical contact information
    // Requirement 8.4: Flag guardians with no phone and no email
    if (!guardian.phone && !guardian.email) {
      issues.push({
        field: 'contact',
        issue: 'MISSING',
        message: 'Guardian has no phone number or email address',
        severity: 'ERROR',
      })
    }

    // Check phone number validity
    // Requirement 8.3: Validate phone numbers against expected formats
    if (guardian.phone && !validatePhoneNumber(guardian.phone)) {
      issues.push({
        field: 'phone',
        issue: 'INVALID',
        message: 'Phone number format is invalid',
        severity: 'ERROR',
      })
    }

    // Check secondary phone validity if present
    if (guardian.secondaryPhone && !validatePhoneNumber(guardian.secondaryPhone)) {
      issues.push({
        field: 'secondaryPhone',
        issue: 'INVALID',
        message: 'Secondary phone number format is invalid',
        severity: 'WARNING',
      })
    }

    // Check for missing first name
    if (!guardian.firstName || guardian.firstName.trim().length === 0) {
      issues.push({
        field: 'firstName',
        issue: 'MISSING',
        message: 'First name is missing',
        severity: 'ERROR',
      })
    }

    // Check for missing last name
    if (!guardian.lastName || guardian.lastName.trim().length === 0) {
      issues.push({
        field: 'lastName',
        issue: 'MISSING',
        message: 'Last name is missing',
        severity: 'ERROR',
      })
    }

    // Check for missing email (warning, not error)
    if (!guardian.email) {
      issues.push({
        field: 'email',
        issue: 'MISSING',
        message: 'Email address is not provided',
        severity: 'WARNING',
      })
    }

    // Check for missing address (warning)
    if (!guardian.address) {
      issues.push({
        field: 'address',
        issue: 'MISSING',
        message: 'Physical address is not provided',
        severity: 'WARNING',
      })
    }

    // Check for missing national ID (warning)
    if (!guardian.nationalId) {
      issues.push({
        field: 'nationalId',
        issue: 'MISSING',
        message: 'National ID is not provided',
        severity: 'WARNING',
      })
    }

    // Calculate quality score
    const score = this.calculateQualityScore(issues)

    return {
      guardianId,
      issues,
      score,
    }
  }

  /**
   * Calculate quality score based on issues
   * Score is 0-100, with 100 being perfect quality
   * Requirement 8.5: Calculate score based on completeness and validity
   */
  calculateQualityScore(issues: DataQualityIssue[]): number {
    if (issues.length === 0) return 100

    let deductions = 0

    for (const issue of issues) {
      // Errors have higher deductions than warnings
      if (issue.severity === 'ERROR') {
        deductions += 20
      } else {
        deductions += 5
      }
    }

    // Ensure score doesn't go below 0
    return Math.max(0, 100 - deductions)
  }

  /**
   * Detect potential duplicate guardians
   * Requirement 8.1: Detect potential duplicate guardians based on phone number and name similarity
   */
  async detectDuplicates(
    guardianId: string,
    options: DuplicateDetectionOptions = {}
  ): Promise<DuplicateDetectionResult> {
    const {
      phoneMatchOnly = false,
      nameMatchOnly = false,
      minNameSimilarity = this.DEFAULT_NAME_SIMILARITY_THRESHOLD,
      excludeGuardianIds = [],
    } = options

    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const potentialDuplicates: DuplicateGuardianMatch[] = []

    // Get all other guardians (excluding the source and any explicitly excluded)
    const excludeIds = [guardianId, ...excludeGuardianIds]
    const allGuardians = await prisma.guardian.findMany({
      where: {
        id: { notIn: excludeIds },
      },
    })

    const normalizedSourcePhone = guardian.phone ? normalizePhone(guardian.phone) : ''
    const sourceFullName = `${guardian.firstName} ${guardian.lastName}`

    for (const otherGuardian of allGuardians) {
      let matchType: 'PHONE_EXACT' | 'NAME_SIMILAR' | 'PHONE_AND_NAME' | null = null
      let similarityScore = 0

      const normalizedOtherPhone = otherGuardian.phone ? normalizePhone(otherGuardian.phone) : ''
      const otherFullName = `${otherGuardian.firstName} ${otherGuardian.lastName}`

      // Check phone match
      const phoneMatch = normalizedSourcePhone && 
                         normalizedOtherPhone && 
                         normalizedSourcePhone === normalizedOtherPhone

      // Check name similarity
      const nameSimilarity = calculateNameSimilarity(sourceFullName, otherFullName)
      const nameMatch = nameSimilarity >= minNameSimilarity

      // Determine match type based on options
      if (phoneMatchOnly) {
        if (phoneMatch) {
          matchType = 'PHONE_EXACT'
          similarityScore = 1.0
        }
      } else if (nameMatchOnly) {
        if (nameMatch) {
          matchType = 'NAME_SIMILAR'
          similarityScore = nameSimilarity
        }
      } else {
        // Check both phone and name
        if (phoneMatch && nameMatch) {
          matchType = 'PHONE_AND_NAME'
          similarityScore = (1.0 + nameSimilarity) / 2 // Average of phone (1.0) and name similarity
        } else if (phoneMatch) {
          matchType = 'PHONE_EXACT'
          similarityScore = 1.0
        } else if (nameMatch) {
          matchType = 'NAME_SIMILAR'
          similarityScore = nameSimilarity
        }
      }

      if (matchType) {
        potentialDuplicates.push({
          guardianId: otherGuardian.id,
          firstName: otherGuardian.firstName,
          lastName: otherGuardian.lastName,
          phone: otherGuardian.phone,
          email: otherGuardian.email ?? undefined,
          matchType,
          similarityScore,
        })
      }
    }

    // Sort by similarity score descending
    potentialDuplicates.sort((a, b) => b.similarityScore - a.similarityScore)

    return {
      sourceGuardianId: guardianId,
      potentialDuplicates,
      hasDuplicates: potentialDuplicates.length > 0,
    }
  }

  /**
   * Suggest merge options for duplicate guardians
   * Requirement 8.2: Suggest merge options to administrators
   */
  async suggestMerge(
    primaryGuardianId: string,
    duplicateGuardianId: string
  ): Promise<GuardianMergeSuggestion> {
    const [primaryGuardian, duplicateGuardian] = await Promise.all([
      prisma.guardian.findUnique({
        where: { id: primaryGuardianId },
        include: {
          studentGuardians: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.guardian.findUnique({
        where: { id: duplicateGuardianId },
        include: {
          studentGuardians: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
    ])

    if (!primaryGuardian) {
      throw new Error(`Primary guardian with id ${primaryGuardianId} not found`)
    }

    if (!duplicateGuardian) {
      throw new Error(`Duplicate guardian with id ${duplicateGuardianId} not found`)
    }

    // Identify conflicting fields
    const conflictingFields: string[] = []
    const suggestedValues: Record<string, unknown> = {}

    // Compare fields and suggest values (prefer primary, but note conflicts)
    const fieldsToCompare = [
      'firstName', 'lastName', 'phone', 'secondaryPhone', 'email',
      'nationalId', 'address', 'preferredChannel', 'languagePreference',
    ] as const

    for (const field of fieldsToCompare) {
      const primaryValue = primaryGuardian[field]
      const duplicateValue = duplicateGuardian[field]

      if (primaryValue !== duplicateValue && duplicateValue) {
        if (primaryValue) {
          conflictingFields.push(field)
          // Prefer primary value, but record the conflict
          suggestedValues[field] = primaryValue
        } else {
          // Primary is empty, use duplicate value
          suggestedValues[field] = duplicateValue
        }
      } else {
        suggestedValues[field] = primaryValue ?? duplicateValue
      }
    }

    // Determine student merge actions
    const linkedStudentsMerge: GuardianMergeSuggestion['linkedStudentsMerge'] = []

    // Get all students linked to duplicate guardian
    for (const sg of duplicateGuardian.studentGuardians) {
      const studentId = sg.studentId
      const studentName = `${sg.student.firstName} ${sg.student.lastName}`

      // Check if primary guardian is also linked to this student
      const primaryAlsoLinked = primaryGuardian.studentGuardians.some(
        psg => psg.studentId === studentId
      )

      if (primaryAlsoLinked) {
        // Both guardians are linked to this student - mark as duplicate
        linkedStudentsMerge.push({
          studentId,
          studentName,
          currentGuardianId: duplicateGuardianId,
          action: 'DUPLICATE',
        })
      } else {
        // Only duplicate guardian is linked - suggest transfer
        linkedStudentsMerge.push({
          studentId,
          studentName,
          currentGuardianId: duplicateGuardianId,
          action: 'TRANSFER',
        })
      }
    }

    // Add students only linked to primary guardian
    for (const sg of primaryGuardian.studentGuardians) {
      const alreadyIncluded = linkedStudentsMerge.some(
        item => item.studentId === sg.studentId
      )
      if (!alreadyIncluded) {
        linkedStudentsMerge.push({
          studentId: sg.studentId,
          studentName: `${sg.student.firstName} ${sg.student.lastName}`,
          currentGuardianId: primaryGuardianId,
          action: 'KEEP',
        })
      }
    }

    return {
      primaryGuardianId,
      duplicateGuardianId,
      conflictingFields,
      suggestedValues,
      linkedStudentsMerge,
    }
  }

  /**
   * Flag guardians with missing critical contact information
   * Requirement 8.4: Flag guardian profiles with missing critical contact information
   */
  async flagMissingContactInfo(schoolId: string): Promise<GuardianDataQualityResult[]> {
    // Get all guardians linked to students in the school
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
    })

    const results: GuardianDataQualityResult[] = []

    for (const guardian of guardians) {
      const issues: DataQualityIssue[] = []

      // Check for missing phone AND email (critical)
      if (!guardian.phone && !guardian.email) {
        issues.push({
          field: 'contact',
          issue: 'MISSING',
          message: 'Guardian has no phone number or email address',
          severity: 'ERROR',
        })
      }

      // Only include guardians with issues
      if (issues.length > 0) {
        results.push({
          guardianId: guardian.id,
          issues,
          score: this.calculateQualityScore(issues),
        })
      }
    }

    return results
  }

  /**
   * Get data quality summary for a school
   * Requirement 8.5: Display data quality indicators
   */
  async getSchoolDataQualitySummary(schoolId: string): Promise<SchoolGuardianDataQualitySummary> {
    // Get all guardians linked to students in the school
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
    })

    const totalGuardians = guardians.length
    let guardiansWithIssues = 0
    let totalScore = 0
    let potentialDuplicateCount = 0

    const issuesByType: Record<DataQualityIssueType, number> = {
      MISSING: 0,
      INVALID: 0,
      DUPLICATE: 0,
    }

    const issuesBySeverity: Record<DataQualityIssueSeverity, number> = {
      WARNING: 0,
      ERROR: 0,
    }

    // Track phones for duplicate detection
    const phoneMap = new Map<string, string[]>()

    for (const guardian of guardians) {
      // Assess quality for each guardian
      const qualityResult = await this.assessGuardianQuality(guardian.id)
      totalScore += qualityResult.score

      if (qualityResult.issues.length > 0) {
        guardiansWithIssues++

        for (const issue of qualityResult.issues) {
          issuesByType[issue.issue]++
          issuesBySeverity[issue.severity]++
        }
      }

      // Track phone numbers for duplicate detection
      if (guardian.phone) {
        const normalizedPhone = normalizePhone(guardian.phone)
        const existing = phoneMap.get(normalizedPhone) || []
        existing.push(guardian.id)
        phoneMap.set(normalizedPhone, existing)
      }
    }

    // Count potential duplicates (phones with more than one guardian)
    for (const guardianIds of phoneMap.values()) {
      if (guardianIds.length > 1) {
        potentialDuplicateCount += guardianIds.length - 1
        issuesByType.DUPLICATE += guardianIds.length - 1
      }
    }

    const averageQualityScore = totalGuardians > 0 ? totalScore / totalGuardians : 100

    return {
      schoolId,
      totalGuardians,
      guardiansWithIssues,
      issuesByType,
      issuesBySeverity,
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      potentialDuplicateCount,
    }
  }

  /**
   * Find all potential duplicates in a school
   * Requirement 8.1: Detect potential duplicate guardians
   */
  async findAllDuplicatesInSchool(
    schoolId: string,
    options: DuplicateDetectionOptions = {}
  ): Promise<DuplicateDetectionResult[]> {
    // Get all guardians linked to students in the school
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
    })

    const results: DuplicateDetectionResult[] = []
    const processedPairs = new Set<string>()

    for (const guardian of guardians) {
      const duplicateResult = await this.detectDuplicates(guardian.id, {
        ...options,
        excludeGuardianIds: [...(options.excludeGuardianIds || [])],
      })

      if (duplicateResult.hasDuplicates) {
        // Filter out already processed pairs to avoid duplicates in results
        const newDuplicates = duplicateResult.potentialDuplicates.filter(dup => {
          const pairKey = [guardian.id, dup.guardianId].sort().join('-')
          if (processedPairs.has(pairKey)) {
            return false
          }
          processedPairs.add(pairKey)
          return true
        })

        if (newDuplicates.length > 0) {
          results.push({
            ...duplicateResult,
            potentialDuplicates: newDuplicates,
            hasDuplicates: true,
          })
        }
      }
    }

    return results
  }

  /**
   * Pure function to check if a guardian has missing contact info
   * Used for property-based testing
   * Requirement 8.4: Flag guardian profiles with missing critical contact information
   */
  hasMissingContactInfo(phone: string | null | undefined, email: string | null | undefined): boolean {
    const hasPhone = phone !== null && phone !== undefined && phone.trim().length > 0
    const hasEmail = email !== null && email !== undefined && email.trim().length > 0
    return !hasPhone && !hasEmail
  }

  /**
   * Pure function to calculate name similarity
   * Used for property-based testing
   * Requirement 8.1: Detect potential duplicate guardians based on name similarity
   */
  calculateNameSimilarityPure(name1: string, name2: string): number {
    return calculateNameSimilarity(name1, name2)
  }

  /**
   * Pure function to check if two phones match
   * Used for property-based testing
   * Requirement 8.1: Detect potential duplicate guardians based on phone number
   */
  phonesMatch(phone1: string, phone2: string): boolean {
    if (!phone1 || !phone2) return false
    return normalizePhone(phone1) === normalizePhone(phone2)
  }
}

// Export singleton instance
export const guardianDataQualityService = new GuardianDataQualityService()
