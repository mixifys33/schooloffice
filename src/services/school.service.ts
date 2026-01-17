/**
 * School Service
 * Handles multi-tenant school management operations
 * Requirements: 1.1, 1.2, 1.3
 */
import { prisma } from '@/lib/db'
import {
  School,
  CreateSchoolInput,
  UpdateSchoolInput,
  FeatureFlags,
} from '@/types'
import { LicenseType } from '@/types/enums'

// Default feature flags based on license type
const DEFAULT_FEATURES_BY_LICENSE: Record<LicenseType, FeatureFlags> = {
  [LicenseType.FREE_PILOT]: {
    smsEnabled: true,
    whatsappEnabled: true,
    paymentIntegration: false,
    advancedReporting: false,
    bulkMessaging: false,
  },
  [LicenseType.BASIC]: {
    smsEnabled: true,
    whatsappEnabled: true,
    paymentIntegration: true,
    advancedReporting: false,
    bulkMessaging: true,
  },
  [LicenseType.PREMIUM]: {
    smsEnabled: true,
    whatsappEnabled: true,
    paymentIntegration: true,
    advancedReporting: true,
    bulkMessaging: true,
  },
}

// Default SMS budget per term by license type
const DEFAULT_SMS_BUDGET: Record<LicenseType, number> = {
  [LicenseType.FREE_PILOT]: 0,
  [LicenseType.BASIC]: 50000,
  [LicenseType.PREMIUM]: 200000,
}

/**
 * Map Prisma School to domain School type
 */
function mapPrismaSchoolToDomain(prismaSchool: {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  logo: string | null
  licenseType: string
  features: unknown
  smsBudgetPerTerm: number
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}): School {
  return {
    id: prismaSchool.id,
    name: prismaSchool.name,
    code: prismaSchool.code,
    address: prismaSchool.address ?? undefined,
    phone: prismaSchool.phone ?? undefined,
    email: prismaSchool.email ?? undefined,
    logo: prismaSchool.logo ?? undefined,
    licenseType: prismaSchool.licenseType as LicenseType,
    features: prismaSchool.features as FeatureFlags,
    smsBudgetPerTerm: prismaSchool.smsBudgetPerTerm,
    createdAt: prismaSchool.createdAt,
    updatedAt: prismaSchool.updatedAt,
    isActive: prismaSchool.isActive,
  }
}

export class SchoolService {
  /**
   * Create a new school with isolated instance provisioning
   * Requirement 1.1: Provision isolated school instance with default configuration
   */
  async createSchool(data: CreateSchoolInput): Promise<School> {
    const licenseType = data.licenseType ?? LicenseType.FREE_PILOT
    const features = DEFAULT_FEATURES_BY_LICENSE[licenseType]
    const smsBudget = data.smsBudgetPerTerm ?? DEFAULT_SMS_BUDGET[licenseType]

    const school = await prisma.school.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logo: data.logo,
        licenseType: licenseType,
        features: features,
        smsBudgetPerTerm: smsBudget,
        isActive: true,
      },
    })

    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Get school by ID
   */
  async getSchoolById(id: string): Promise<School | null> {
    const school = await prisma.school.findUnique({
      where: { id },
    })

    if (!school) return null
    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Get school by unique code
   */
  async getSchoolByCode(code: string): Promise<School | null> {
    const school = await prisma.school.findUnique({
      where: { code },
    })

    if (!school) return null
    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Update school information
   */
  async updateSchool(id: string, data: UpdateSchoolInput): Promise<School> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.address !== undefined) updateData.address = data.address
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.logo !== undefined) updateData.logo = data.logo
    if (data.smsBudgetPerTerm !== undefined) updateData.smsBudgetPerTerm = data.smsBudgetPerTerm
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    // Handle license type change - also update features
    if (data.licenseType !== undefined) {
      updateData.licenseType = data.licenseType
      updateData.features = DEFAULT_FEATURES_BY_LICENSE[data.licenseType]
    }

    // Handle partial feature flag updates
    if (data.features !== undefined) {
      const currentSchool = await prisma.school.findUnique({ where: { id } })
      if (currentSchool) {
        const currentFeatures = currentSchool.features as FeatureFlags
        updateData.features = { ...currentFeatures, ...data.features }
      }
    }

    const school = await prisma.school.update({
      where: { id },
      data: updateData,
    })

    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Activate a school
   */
  async activateSchool(id: string): Promise<School> {
    const school = await prisma.school.update({
      where: { id },
      data: { isActive: true },
    })

    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Deactivate a school
   */
  async deactivateSchool(id: string): Promise<School> {
    const school = await prisma.school.update({
      where: { id },
      data: { isActive: false },
    })

    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Assign license to school
   * Requirement 1.2: Enable features according to license tier
   */
  async assignLicense(id: string, licenseType: LicenseType): Promise<School> {
    const features = DEFAULT_FEATURES_BY_LICENSE[licenseType]
    const smsBudget = DEFAULT_SMS_BUDGET[licenseType]

    const school = await prisma.school.update({
      where: { id },
      data: {
        licenseType: licenseType,
        features: features,
        smsBudgetPerTerm: smsBudget,
      },
    })

    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Update feature flags for a school
   * Requirement 1.3: Toggle features immediately for all users
   */
  async updateFeatureFlags(id: string, features: Partial<FeatureFlags>): Promise<School> {
    const currentSchool = await prisma.school.findUnique({ where: { id } })
    if (!currentSchool) {
      throw new Error(`School with id ${id} not found`)
    }

    const currentFeatures = currentSchool.features as FeatureFlags
    const updatedFeatures = { ...currentFeatures, ...features }

    const school = await prisma.school.update({
      where: { id },
      data: { features: updatedFeatures },
    })

    return mapPrismaSchoolToDomain(school)
  }

  /**
   * Get all schools (for Super Admin)
   */
  async getAllSchools(): Promise<School[]> {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return schools.map(mapPrismaSchoolToDomain)
  }

  /**
   * Get active schools only
   */
  async getActiveSchools(): Promise<School[]> {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return schools.map(mapPrismaSchoolToDomain)
  }

  /**
   * Check if a school code is available
   */
  async isCodeAvailable(code: string): Promise<boolean> {
    const existing = await prisma.school.findUnique({
      where: { code },
      select: { id: true },
    })
    return !existing
  }

  /**
   * Get feature flags for a school
   */
  async getFeatureFlags(schoolId: string): Promise<FeatureFlags | null> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { features: true },
    })

    if (!school) return null
    return school.features as FeatureFlags
  }

  /**
   * Check if a specific feature is enabled for a school
   */
  async isFeatureEnabled(schoolId: string, feature: keyof FeatureFlags): Promise<boolean> {
    const features = await this.getFeatureFlags(schoolId)
    if (!features) return false
    return features[feature]
  }
}

// Export singleton instance
export const schoolService = new SchoolService()
