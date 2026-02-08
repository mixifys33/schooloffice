/**
 * Health Score Service Unit Tests
 * Tests for health score calculation logic
 */
import { HealthScoreService, SchoolMetricsInput } from '@/services/health-score.service'

describe('HealthScoreService', () => {
  let service: HealthScoreService

  beforeEach(() => {
    service = new HealthScoreService()
  })

  describe('calculateActivityScore', () => {
    it('should return 30 points for login within 7 days', () => {
      const now = new Date()
      const loginDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      const score = service.calculateActivityScore(loginDate)
      expect(score).toBe(30)
    })

    it('should return 30 points for login exactly 7 days ago', () => {
      const now = new Date()
      const loginDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      const score = service.calculateActivityScore(loginDate)
      expect(score).toBe(30)
    })

    it('should return 15 points for login within 30 days', () => {
      const now = new Date()
      const loginDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      const score = service.calculateActivityScore(loginDate)
      expect(score).toBe(15)
    })

    it('should return 15 points for login exactly 30 days ago', () => {
      const now = new Date()
      const loginDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const score = service.calculateActivityScore(loginDate)
      expect(score).toBe(15)
    })

    it('should return 0 points for login beyond 30 days', () => {
      const now = new Date()
      const loginDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
      const score = service.calculateActivityScore(loginDate)
      expect(score).toBe(0)
    })

    it('should return 0 points for null login date', () => {
      const score = service.calculateActivityScore(null)
      expect(score).toBe(0)
    })
  })

  describe('calculateDataCompletenessScore', () => {
    it('should return 20 points when all fields are populated', () => {
      const score = service.calculateDataCompletenessScore(10, 5, 3, 2)
      expect(score).toBe(20)
    })

    it('should return 15 points when 3 out of 4 fields are populated', () => {
      const score = service.calculateDataCompletenessScore(10, 5, 3, 0)
      expect(score).toBe(15)
    })

    it('should return 10 points when 2 out of 4 fields are populated', () => {
      const score = service.calculateDataCompletenessScore(10, 5, 0, 0)
      expect(score).toBe(10)
    })

    it('should return 5 points when 1 out of 4 fields is populated', () => {
      const score = service.calculateDataCompletenessScore(10, 0, 0, 0)
      expect(score).toBe(5)
    })

    it('should return 0 points when no fields are populated', () => {
      const score = service.calculateDataCompletenessScore(0, 0, 0, 0)
      expect(score).toBe(0)
    })
  })

  describe('calculateSmsEngagementScore', () => {
    it('should return 20 points for optimal SMS usage (4 messages per student)', () => {
      const score = service.calculateSmsEngagementScore(400, 100)
      expect(score).toBe(20)
    })

    it('should return 10 points for half optimal usage (2 messages per student)', () => {
      const score = service.calculateSmsEngagementScore(200, 100)
      expect(score).toBe(10)
    })

    it('should return 5 points for quarter optimal usage (1 message per student)', () => {
      const score = service.calculateSmsEngagementScore(100, 100)
      expect(score).toBe(5)
    })

    it('should cap at 20 points for above optimal usage', () => {
      const score = service.calculateSmsEngagementScore(1000, 100) // 10 messages per student
      expect(score).toBe(20)
    })

    it('should return 0 points when no SMS sent', () => {
      const score = service.calculateSmsEngagementScore(0, 100)
      expect(score).toBe(0)
    })

    it('should return 0 points when student count is 0', () => {
      const score = service.calculateSmsEngagementScore(100, 0)
      expect(score).toBe(0)
    })
  })

  describe('calculatePaymentDisciplineScore', () => {
    it('should return 20 points when payment is current (billing date in future)', () => {
      const now = new Date()
      const nextBillingDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days in future
      const lastPaymentDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      const score = service.calculatePaymentDisciplineScore(
        lastPaymentDate,
        nextBillingDate
      )
      expect(score).toBe(20)
    })

    it('should return 10 points when payment is within 7 days of due date', () => {
      const now = new Date()
      const nextBillingDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days overdue
      const lastPaymentDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
      const score = service.calculatePaymentDisciplineScore(
        lastPaymentDate,
        nextBillingDate
      )
      expect(score).toBe(10)
    })

    it('should return 10 points when payment is exactly 7 days overdue', () => {
      const now = new Date()
      const nextBillingDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days overdue
      const lastPaymentDate = new Date(now.getTime() - 37 * 24 * 60 * 60 * 1000) // 37 days ago
      const score = service.calculatePaymentDisciplineScore(
        lastPaymentDate,
        nextBillingDate
      )
      expect(score).toBe(10)
    })

    it('should return 0 points when payment is overdue by more than 7 days', () => {
      const now = new Date()
      const nextBillingDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days overdue
      const lastPaymentDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
      const score = service.calculatePaymentDisciplineScore(
        lastPaymentDate,
        nextBillingDate
      )
      expect(score).toBe(0)
    })

    it('should return 20 points when no billing date is set (new school)', () => {
      const lastPaymentDate = new Date()
      const score = service.calculatePaymentDisciplineScore(
        lastPaymentDate,
        null
      )
      expect(score).toBe(20)
    })
  })

  describe('calculateGrowthScore', () => {
    it('should return 10 points for positive growth', () => {
      const history = [80, 100] // Grew from 80 to 100 students
      const score = service.calculateGrowthScore(history)
      expect(score).toBe(10)
    })

    it('should return 5 points for no change', () => {
      const history = [100, 100] // No change
      const score = service.calculateGrowthScore(history)
      expect(score).toBe(5)
    })

    it('should return 0 points for negative growth', () => {
      const history = [100, 80] // Declined from 100 to 80 students
      const score = service.calculateGrowthScore(history)
      expect(score).toBe(0)
    })

    it('should return 5 points (neutral) when history has less than 2 data points', () => {
      const history = [100]
      const score = service.calculateGrowthScore(history)
      expect(score).toBe(5)
    })

    it('should return 5 points (neutral) when history is empty', () => {
      const history: number[] = []
      const score = service.calculateGrowthScore(history)
      expect(score).toBe(5)
    })

    it('should use the two most recent data points from longer history', () => {
      const history = [50, 60, 70, 80, 100] // Most recent: 80 -> 100 (positive)
      const score = service.calculateGrowthScore(history)
      expect(score).toBe(10)
    })
  })

  describe('calculateHealthScoreFromMetrics', () => {
    it('should calculate correct total score for a healthy school', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-123',
        lastAdminLogin: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsBalance: 1000,
        smsSentThisMonth: 400, // 4 per student (optimal)
        lastPaymentDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        lastPaymentAmount: 500,
        nextBillingDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // Future
        mrr: 500,
        totalRevenue: 5000,
        studentCountHistory: [90, 100], // Positive growth
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.activityScore).toBe(30) // Login within 7 days
      expect(breakdown.dataCompletenessScore).toBe(15) // 3 out of 4 fields (no fee structure)
      expect(breakdown.smsEngagementScore).toBe(20) // Optimal SMS usage
      expect(breakdown.paymentDisciplineScore).toBe(20) // Current payment
      expect(breakdown.growthScore).toBe(10) // Positive growth
      expect(breakdown.totalScore).toBe(95) // Sum of all components
    })

    it('should calculate correct total score for a struggling school', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-456',
        lastAdminLogin: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        studentCount: 50,
        teacherCount: 0,
        classCount: 0,
        smsBalance: 50,
        smsSentThisMonth: 0,
        lastPaymentDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        lastPaymentAmount: 0,
        nextBillingDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days overdue
        mrr: 0,
        totalRevenue: 0,
        studentCountHistory: [60, 50], // Negative growth
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.activityScore).toBe(0) // No login beyond 30 days
      expect(breakdown.dataCompletenessScore).toBe(5) // Only 1 out of 4 fields
      expect(breakdown.smsEngagementScore).toBe(0) // No SMS sent
      expect(breakdown.paymentDisciplineScore).toBe(0) // Overdue by more than 7 days
      expect(breakdown.growthScore).toBe(0) // Negative growth
      expect(breakdown.totalScore).toBe(5) // Sum of all components
    })

    it('should ensure total score is within 0-100 bounds', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-789',
        lastAdminLogin: now,
        studentCount: 1000,
        teacherCount: 50,
        classCount: 30,
        smsBalance: 10000,
        smsSentThisMonth: 10000, // Very high usage
        lastPaymentDate: now,
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 50000,
        studentCountHistory: [800, 1000], // Strong growth
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.totalScore).toBeGreaterThanOrEqual(0)
      expect(breakdown.totalScore).toBeLessThanOrEqual(100)
    })

    it('should handle edge case with zero student count', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-empty',
        lastAdminLogin: now,
        studentCount: 0,
        teacherCount: 0,
        classCount: 0,
        smsBalance: 0,
        smsSentThisMonth: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        nextBillingDate: null,
        mrr: 0,
        totalRevenue: 0,
        studentCountHistory: [],
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.activityScore).toBe(30) // Recent login
      expect(breakdown.dataCompletenessScore).toBe(0) // No data
      expect(breakdown.smsEngagementScore).toBe(0) // No students
      expect(breakdown.paymentDisciplineScore).toBe(20) // No billing date (new school)
      expect(breakdown.growthScore).toBe(5) // Neutral (no history)
      expect(breakdown.totalScore).toBe(55)
    })

    it('should verify total score equals sum of component scores', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-verify',
        lastAdminLogin: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        studentCount: 75,
        teacherCount: 8,
        classCount: 4,
        smsBalance: 500,
        smsSentThisMonth: 150,
        lastPaymentDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        lastPaymentAmount: 300,
        nextBillingDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        mrr: 300,
        totalRevenue: 3000,
        studentCountHistory: [75, 75],
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      const expectedTotal =
        breakdown.activityScore +
        breakdown.dataCompletenessScore +
        breakdown.smsEngagementScore +
        breakdown.paymentDisciplineScore +
        breakdown.growthScore

      expect(breakdown.totalScore).toBe(expectedTotal)
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very large student counts', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-large',
        lastAdminLogin: now,
        studentCount: 10000,
        teacherCount: 500,
        classCount: 200,
        smsBalance: 100000,
        smsSentThisMonth: 40000,
        lastPaymentDate: now,
        lastPaymentAmount: 10000,
        nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        mrr: 10000,
        totalRevenue: 500000,
        studentCountHistory: [9000, 10000],
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.totalScore).toBeGreaterThanOrEqual(0)
      expect(breakdown.totalScore).toBeLessThanOrEqual(100)
    })

    it('should handle negative values gracefully', () => {
      const now = new Date()
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-negative',
        lastAdminLogin: now,
        studentCount: 0,
        teacherCount: 0,
        classCount: 0,
        smsBalance: -100, // Negative balance (edge case)
        smsSentThisMonth: 0,
        lastPaymentDate: null,
        lastPaymentAmount: -50, // Negative amount (edge case)
        nextBillingDate: null,
        mrr: -100, // Negative MRR (edge case)
        totalRevenue: 0,
        studentCountHistory: [],
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.totalScore).toBeGreaterThanOrEqual(0)
      expect(breakdown.totalScore).toBeLessThanOrEqual(100)
    })

    it('should handle dates far in the past', () => {
      const now = new Date()
      const veryOldDate = new Date('2000-01-01')
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-old',
        lastAdminLogin: veryOldDate,
        studentCount: 50,
        teacherCount: 5,
        classCount: 3,
        smsBalance: 100,
        smsSentThisMonth: 50,
        lastPaymentDate: veryOldDate,
        lastPaymentAmount: 100,
        nextBillingDate: veryOldDate,
        mrr: 100,
        totalRevenue: 1000,
        studentCountHistory: [50, 50],
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.activityScore).toBe(0) // Very old login
      expect(breakdown.paymentDisciplineScore).toBe(0) // Very overdue
      expect(breakdown.totalScore).toBeGreaterThanOrEqual(0)
      expect(breakdown.totalScore).toBeLessThanOrEqual(100)
    })

    it('should handle dates far in the future', () => {
      const now = new Date()
      const futureDate = new Date('2100-01-01')
      const metrics: SchoolMetricsInput = {
        schoolId: 'school-future',
        lastAdminLogin: now,
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsBalance: 1000,
        smsSentThisMonth: 400,
        lastPaymentDate: now,
        lastPaymentAmount: 500,
        nextBillingDate: futureDate,
        mrr: 500,
        totalRevenue: 5000,
        studentCountHistory: [90, 100],
      }

      const breakdown = service.calculateHealthScoreFromMetrics(metrics)

      expect(breakdown.paymentDisciplineScore).toBe(20) // Future billing date = current
      expect(breakdown.totalScore).toBeGreaterThanOrEqual(0)
      expect(breakdown.totalScore).toBeLessThanOrEqual(100)
    })
  })
})
