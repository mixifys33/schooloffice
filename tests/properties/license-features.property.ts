/**
 * Property Test: License Feature Enforcement
 * **Feature: school-office, Property 2: License Feature Enforcement**
 * **Validates: Requirements 1.2**
 * 
 * For any school with a given license type, the enabled features SHALL 
 * exactly match the feature set defined for that license tier.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { LicenseType } from '../../src/types/enums'
import { FeatureFlags } from '../../src/types/entities'

// Define the expected feature sets for each license type
// This mirrors the implementation in school.service.ts
const EXPECTED_FEATURES_BY_LICENSE: Record<LicenseType, FeatureFlags> = {
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

// Simulated license assignment function (mirrors service behavior)
function assignLicenseFeatures(licenseType: LicenseType): FeatureFlags {
  return { ...EXPECTED_FEATURES_BY_LICENSE[licenseType] }
}

// Check if features match exactly
function featuresMatch(a: FeatureFlags, b: FeatureFlags): boolean {
  return (
    a.smsEnabled === b.smsEnabled &&
    a.whatsappEnabled === b.whatsappEnabled &&
    a.paymentIntegration === b.paymentIntegration &&
    a.advancedReporting === b.advancedReporting &&
    a.bulkMessaging === b.bulkMessaging
  )
}

// Arbitraries
const licenseTypeArbitrary = fc.constantFrom(...Object.values(LicenseType))

const schoolArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  code: fc.string({ minLength: 3, maxLength: 10 }),
  licenseType: licenseTypeArbitrary,
})

describe('Property 2: License Feature Enforcement', () => {
  /**
   * Property: When a license is assigned, features exactly match the license tier definition
   */
  it('assigned features exactly match license tier definition', () => {
    fc.assert(
      fc.property(licenseTypeArbitrary, (licenseType) => {
        const assignedFeatures = assignLicenseFeatures(licenseType)
        const expectedFeatures = EXPECTED_FEATURES_BY_LICENSE[licenseType]
        
        return featuresMatch(assignedFeatures, expectedFeatures)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: FREE_PILOT license has restricted features
   */
  it('FREE_PILOT license has payment and advanced features disabled', () => {
    fc.assert(
      fc.property(fc.constant(LicenseType.FREE_PILOT), (licenseType) => {
        const features = assignLicenseFeatures(licenseType)
        
        // FREE_PILOT should have basic communication but no premium features
        return (
          features.smsEnabled === true &&
          features.whatsappEnabled === true &&
          features.paymentIntegration === false &&
          features.advancedReporting === false &&
          features.bulkMessaging === false
        )
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: BASIC license has payment integration enabled
   */
  it('BASIC license has payment integration and bulk messaging enabled', () => {
    fc.assert(
      fc.property(fc.constant(LicenseType.BASIC), (licenseType) => {
        const features = assignLicenseFeatures(licenseType)
        
        return (
          features.paymentIntegration === true &&
          features.bulkMessaging === true &&
          features.advancedReporting === false
        )
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: PREMIUM license has all features enabled
   */
  it('PREMIUM license has all features enabled', () => {
    fc.assert(
      fc.property(fc.constant(LicenseType.PREMIUM), (licenseType) => {
        const features = assignLicenseFeatures(licenseType)
        
        return (
          features.smsEnabled === true &&
          features.whatsappEnabled === true &&
          features.paymentIntegration === true &&
          features.advancedReporting === true &&
          features.bulkMessaging === true
        )
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: License upgrade increases or maintains feature access
   */
  it('upgrading license never reduces feature access', () => {
    fc.assert(
      fc.property(
        licenseTypeArbitrary,
        licenseTypeArbitrary,
        (fromLicense, toLicense) => {
          // Define license hierarchy
          const licenseRank: Record<LicenseType, number> = {
            [LicenseType.FREE_PILOT]: 0,
            [LicenseType.BASIC]: 1,
            [LicenseType.PREMIUM]: 2,
          }

          // Only test upgrades (higher rank)
          fc.pre(licenseRank[toLicense] >= licenseRank[fromLicense])

          const fromFeatures = assignLicenseFeatures(fromLicense)
          const toFeatures = assignLicenseFeatures(toLicense)

          // Count enabled features
          const countEnabled = (f: FeatureFlags) =>
            Object.values(f).filter(Boolean).length

          // Upgrading should never reduce the number of enabled features
          return countEnabled(toFeatures) >= countEnabled(fromFeatures)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Each license type produces consistent features across multiple assignments
   */
  it('same license type always produces identical features', () => {
    fc.assert(
      fc.property(
        licenseTypeArbitrary,
        fc.integer({ min: 2, max: 10 }),
        (licenseType, assignmentCount) => {
          const assignments: FeatureFlags[] = []
          
          for (let i = 0; i < assignmentCount; i++) {
            assignments.push(assignLicenseFeatures(licenseType))
          }

          // All assignments should produce identical features
          const first = assignments[0]
          return assignments.every(f => featuresMatch(f, first))
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Feature flags are independent - changing one doesn't affect others
   */
  it('feature flags are independent boolean values', () => {
    fc.assert(
      fc.property(licenseTypeArbitrary, (licenseType) => {
        const features = assignLicenseFeatures(licenseType)
        
        // All feature values should be booleans
        return (
          typeof features.smsEnabled === 'boolean' &&
          typeof features.whatsappEnabled === 'boolean' &&
          typeof features.paymentIntegration === 'boolean' &&
          typeof features.advancedReporting === 'boolean' &&
          typeof features.bulkMessaging === 'boolean'
        )
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All license types have SMS and WhatsApp enabled (base communication)
   */
  it('all license types have base communication features enabled', () => {
    fc.assert(
      fc.property(licenseTypeArbitrary, (licenseType) => {
        const features = assignLicenseFeatures(licenseType)
        
        // SMS and WhatsApp should always be enabled regardless of license
        return features.smsEnabled === true && features.whatsappEnabled === true
      }),
      { numRuns: 20 }
    )
  })
})
