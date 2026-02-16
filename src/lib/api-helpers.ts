/**
 * API Helper Functions - Multi-Tenancy Support
 * 
 * Common patterns for API endpoints with schoolId filtering
 */

import { PrismaClient } from '@prisma/client'
import {
  getSchoolIdFromSession,
  isSuperAdmin,
  validateSchoolAccess,
} from '@/middleware/schoolId'

const prisma = new PrismaClient()

/**
 * Find many with automatic schoolId filtering
 * Super admins see all schools, others see only their school
 */
export async function findManyWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where?: any
    include?: any
    select?: any
    orderBy?: any
    take?: number
    skip?: number
  } = {}
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.findMany({
    ...options,
    where,
  })
}

/**
 * Find unique with schoolId validation
 * Validates that the resource belongs to the user's school
 */
export async function findUniqueWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where: any
    include?: any
    select?: any
  }
) {
  const resource = await model.findUnique(options)

  if (!resource) {
    return null
  }

  // Validate school access
  await validateSchoolAccess(resource.schoolId)

  return resource
}

/**
 * Find first with automatic schoolId filtering
 */
export async function findFirstWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where?: any
    include?: any
    select?: any
    orderBy?: any
  } = {}
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.findFirst({
    ...options,
    where,
  })
}

/**
 * Create with automatic schoolId injection
 */
export async function createWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  data: Omit<T, 'schoolId' | 'id' | 'createdAt' | 'updatedAt'>
) {
  const schoolId = await getSchoolIdFromSession()

  return model.create({
    data: {
      ...data,
      schoolId,
    },
  })
}

/**
 * Update with schoolId validation
 * Validates that the resource belongs to the user's school before updating
 */
export async function updateWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where: any
    data: any
    include?: any
    select?: any
  }
) {
  // First, verify the resource exists and belongs to the user's school
  const existing = await model.findUnique({
    where: options.where,
    select: { schoolId: true },
  })

  if (!existing) {
    throw new Error('Resource not found')
  }

  await validateSchoolAccess(existing.schoolId)

  // Now perform the update
  return model.update(options)
}

/**
 * Delete with schoolId validation
 * Validates that the resource belongs to the user's school before deleting
 */
export async function deleteWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where: any
  }
) {
  // First, verify the resource exists and belongs to the user's school
  const existing = await model.findUnique({
    where: options.where,
    select: { schoolId: true },
  })

  if (!existing) {
    throw new Error('Resource not found')
  }

  await validateSchoolAccess(existing.schoolId)

  // Now perform the delete
  return model.delete(options)
}

/**
 * Count with automatic schoolId filtering
 */
export async function countWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where?: any
  } = {}
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.count({ where })
}

/**
 * Aggregate with automatic schoolId filtering
 */
export async function aggregateWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where?: any
    _count?: any
    _sum?: any
    _avg?: any
    _min?: any
    _max?: any
  } = {}
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.aggregate({
    ...options,
    where,
  })
}

/**
 * Group by with automatic schoolId filtering
 */
export async function groupByWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    by: any
    where?: any
    _count?: any
    _sum?: any
    _avg?: any
    _min?: any
    _max?: any
    orderBy?: any
    take?: number
    skip?: number
  }
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.groupBy({
    ...options,
    where,
  })
}

/**
 * Batch create with automatic schoolId injection
 */
export async function createManyWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  data: Array<Omit<T, 'schoolId' | 'id' | 'createdAt' | 'updatedAt'>>
) {
  const schoolId = await getSchoolIdFromSession()

  const dataWithSchoolId = data.map((item) => ({
    ...item,
    schoolId,
  }))

  return model.createMany({
    data: dataWithSchoolId,
  })
}

/**
 * Update many with schoolId filtering
 * Only updates records belonging to the user's school
 */
export async function updateManyWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where?: any
    data: any
  }
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.updateMany({
    where,
    data: options.data,
  })
}

/**
 * Delete many with schoolId filtering
 * Only deletes records belonging to the user's school
 */
export async function deleteManyWithSchoolId<T extends { schoolId?: string }>(
  model: any,
  options: {
    where?: any
  } = {}
) {
  const isSuper = await isSuperAdmin()

  const where = isSuper
    ? options.where || {}
    : {
        ...(options.where || {}),
        schoolId: await getSchoolIdFromSession(),
      }

  return model.deleteMany({ where })
}

export { prisma }
