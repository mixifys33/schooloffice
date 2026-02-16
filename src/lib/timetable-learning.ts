/**
 * Timetable Learning System
 * 
 * Learns from DoS manual adjustments and improves future generations
 * Stores preferences, recognizes patterns, adapts weights over time
 */

import { prisma } from '@/lib/db'

// ============================================================================
// Types
// ============================================================================

export interface TimetablePreference {
  id: string
  schoolId: string
  subjectId: string
  preferredSlots: PreferredSlot[]
  avoidSlots: AvoidSlot[]
  createdAt: Date
  updatedAt: Date
}

export interface PreferredSlot {
  dayOfWeek: number
  period: number
  weight: number // 0-1, increases with usage
}

export interface AvoidSlot {
  dayOfWeek: number
  period: number
  weight: number // 0-1, increases when moved away
}

export interface AdjustmentPattern {
  id: string
  schoolId: string
  subjectId: string
  fromSlot: { dayOfWeek: number; period: number }
  toSlot: { dayOfWeek: number; period: number }
  frequency: number
  lastOccurred: Date
}

export interface AdaptiveWeights {
  teacherGaps: number
  heavySubjectsAfternoon: number
  workloadBalance: number
  subjectDistribution: number
}

// ============================================================================
// Learning Functions
// ============================================================================

/**
 * Learn from manual adjustment
 * Called when DoS moves an entry to a different slot
 */
export async function learnFromAdjustment(
  schoolId: string,
  subjectId: string,
  originalSlot: { dayOfWeek: number; period: number },
  newSlot: { dayOfWeek: number; period: number }
): Promise<void> {
  try {
    // 1. Increase preference for new slot
    await increasePreference(schoolId, subjectId, newSlot, 0.1)

    // 2. Decrease preference for original slot (mark as avoid)
    await decreasePreference(schoolId, subjectId, originalSlot, 0.1)

    // 3. Store pattern
    await storePattern(schoolId, subjectId, originalSlot, newSlot)

    console.log(`📚 [Learning] Learned adjustment: ${subjectId} moved from ${originalSlot.dayOfWeek}/${originalSlot.period} to ${newSlot.dayOfWeek}/${newSlot.period}`)
  } catch (error) {
    console.error('❌ [Learning] Error learning from adjustment:', error)
  }
}

/**
 * Increase preference weight for a slot
 */
async function increasePreference(
  schoolId: string,
  subjectId: string,
  slot: { dayOfWeek: number; period: number },
  increment: number
): Promise<void> {
  // Find or create preference record
  let preference = await prisma.timetablePreference.findFirst({
    where: { schoolId, subjectId }
  })

  if (!preference) {
    preference = await prisma.timetablePreference.create({
      data: {
        schoolId,
        subjectId,
        preferredSlots: [],
        avoidSlots: []
      }
    })
  }

  // Update preferred slots
  const preferredSlots = preference.preferredSlots as PreferredSlot[]
  const existingIndex = preferredSlots.findIndex(
    s => s.dayOfWeek === slot.dayOfWeek && s.period === slot.period
  )

  if (existingIndex >= 0) {
    // Increase existing weight (max 1.0)
    preferredSlots[existingIndex].weight = Math.min(
      1.0,
      preferredSlots[existingIndex].weight + increment
    )
  } else {
    // Add new preferred slot
    preferredSlots.push({
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      weight: increment
    })
  }

  await prisma.timetablePreference.update({
    where: { id: preference.id },
    data: { preferredSlots }
  })
}

/**
 * Decrease preference weight for a slot (mark as avoid)
 */
async function decreasePreference(
  schoolId: string,
  subjectId: string,
  slot: { dayOfWeek: number; period: number },
  decrement: number
): Promise<void> {
  // Find or create preference record
  let preference = await prisma.timetablePreference.findFirst({
    where: { schoolId, subjectId }
  })

  if (!preference) {
    preference = await prisma.timetablePreference.create({
      data: {
        schoolId,
        subjectId,
        preferredSlots: [],
        avoidSlots: []
      }
    })
  }

  // Update avoid slots
  const avoidSlots = preference.avoidSlots as AvoidSlot[]
  const existingIndex = avoidSlots.findIndex(
    s => s.dayOfWeek === slot.dayOfWeek && s.period === slot.period
  )

  if (existingIndex >= 0) {
    // Increase avoid weight (max 1.0)
    avoidSlots[existingIndex].weight = Math.min(
      1.0,
      avoidSlots[existingIndex].weight + decrement
    )
  } else {
    // Add new avoid slot
    avoidSlots.push({
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      weight: decrement
    })
  }

  await prisma.timetablePreference.update({
    where: { id: preference.id },
    data: { avoidSlots }
  })
}

/**
 * Store adjustment pattern
 */
async function storePattern(
  schoolId: string,
  subjectId: string,
  fromSlot: { dayOfWeek: number; period: number },
  toSlot: { dayOfWeek: number; period: number }
): Promise<void> {
  // Find existing pattern
  const existing = await prisma.adjustmentPattern.findFirst({
    where: {
      schoolId,
      subjectId,
      fromSlot: { equals: fromSlot },
      toSlot: { equals: toSlot }
    }
  })

  if (existing) {
    // Increment frequency
    await prisma.adjustmentPattern.update({
      where: { id: existing.id },
      data: {
        frequency: existing.frequency + 1,
        lastOccurred: new Date()
      }
    })
  } else {
    // Create new pattern
    await prisma.adjustmentPattern.create({
      data: {
        schoolId,
        subjectId,
        fromSlot,
        toSlot,
        frequency: 1,
        lastOccurred: new Date()
      }
    })
  }
}

/**
 * Get learned preferences for a subject
 */
export async function getPreferences(
  schoolId: string,
  subjectId: string
): Promise<TimetablePreference | null> {
  return await prisma.timetablePreference.findFirst({
    where: { schoolId, subjectId }
  })
}

/**
 * Get preference weight for a specific slot
 */
export function getPreferenceWeight(
  preferences: TimetablePreference | null,
  slot: { dayOfWeek: number; period: number }
): number {
  if (!preferences) return 0.5 // Neutral

  const preferredSlots = preferences.preferredSlots as PreferredSlot[]
  const avoidSlots = preferences.avoidSlots as AvoidSlot[]

  // Check if preferred
  const preferred = preferredSlots.find(
    s => s.dayOfWeek === slot.dayOfWeek && s.period === slot.period
  )
  if (preferred) return 0.5 + (preferred.weight * 0.5) // 0.5-1.0

  // Check if avoided
  const avoided = avoidSlots.find(
    s => s.dayOfWeek === slot.dayOfWeek && s.period === slot.period
  )
  if (avoided) return 0.5 - (avoided.weight * 0.5) // 0.0-0.5

  return 0.5 // Neutral
}

/**
 * Get common adjustment patterns
 */
export async function getCommonPatterns(
  schoolId: string,
  limit: number = 10
): Promise<AdjustmentPattern[]> {
  return await prisma.adjustmentPattern.findMany({
    where: { schoolId },
    orderBy: { frequency: 'desc' },
    take: limit
  })
}

/**
 * Adapt optimization weights based on historical adjustments
 */
export async function adaptWeights(
  schoolId: string,
  currentWeights: AdaptiveWeights
): Promise<AdaptiveWeights> {
  // Get all patterns
  const patterns = await prisma.adjustmentPattern.findMany({
    where: { schoolId },
    orderBy: { frequency: 'desc' }
  })

  if (patterns.length === 0) return currentWeights

  // Analyze patterns to adjust weights
  const adaptedWeights = { ...currentWeights }

  // Count pattern types
  let morningToAfternoon = 0
  let afternoonToMorning = 0
  let gapReduction = 0
  let clustering = 0

  for (const pattern of patterns) {
    const from = pattern.fromSlot as { dayOfWeek: number; period: number }
    const to = pattern.toSlot as { dayOfWeek: number; period: number }

    // Morning to afternoon moves (reduce heavy subjects afternoon weight)
    if (from.period <= 4 && to.period > 4) {
      morningToAfternoon += pattern.frequency
    }

    // Afternoon to morning moves (increase heavy subjects afternoon weight)
    if (from.period > 4 && to.period <= 4) {
      afternoonToMorning += pattern.frequency
    }

    // Same day moves (likely gap reduction)
    if (from.dayOfWeek === to.dayOfWeek) {
      gapReduction += pattern.frequency
    }

    // Different day moves (likely clustering reduction)
    if (from.dayOfWeek !== to.dayOfWeek) {
      clustering += pattern.frequency
    }
  }

  // Adapt weights based on patterns
  if (afternoonToMorning > morningToAfternoon * 2) {
    // DoS frequently moves heavy subjects to morning
    adaptedWeights.heavySubjectsAfternoon = Math.min(1.0, currentWeights.heavySubjectsAfternoon + 0.1)
  }

  if (gapReduction > patterns.length * 0.3) {
    // DoS frequently reduces gaps
    adaptedWeights.teacherGaps = Math.min(1.0, currentWeights.teacherGaps + 0.1)
  }

  if (clustering > patterns.length * 0.3) {
    // DoS frequently spreads subjects
    adaptedWeights.subjectDistribution = Math.min(1.0, currentWeights.subjectDistribution + 0.1)
  }

  console.log(`🧠 [Learning] Adapted weights:`, adaptedWeights)

  return adaptedWeights
}

/**
 * Clear old preferences (older than 6 months)
 */
export async function clearOldPreferences(schoolId: string): Promise<number> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const result = await prisma.timetablePreference.deleteMany({
    where: {
      schoolId,
      updatedAt: { lt: sixMonthsAgo }
    }
  })

  return result.count
}
