/**
 * Unit tests for Health Score Calculator Job
 * 
 * Tests the background job wrapper and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runHealthScoreCalculation } from '@/jobs/health-score-calculator'
import { healthScoreService } from '@/services/health-score.service'

// Mock the health score service
vi.mock('@/services/health-score.service', () => ({
  healthScoreService: {
    calculateAllHealthScores: vi.fn(),
  },
}))

describe('Health Score Calculator Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully run health score calculation', async () => {
    // Arrange
    vi.mocked(healthScoreService.calculateAllHealthScores).mockResolvedValue()

    // Act
    await runHealthScoreCalculation()

    // Assert
    expect(healthScoreService.calculateAllHealthScores).toHaveBeenCalledTimes(1)
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Starting health score calculation job')
    )
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('completed successfully')
    )
  })

  it('should log start and completion messages', async () => {
    // Arrange
    vi.mocked(healthScoreService.calculateAllHealthScores).mockResolvedValue()

    // Act
    await runHealthScoreCalculation()

    // Assert
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Starting health score calculation job/)
    )
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Health score calculation completed successfully in \d+ms/)
    )
  })

  it('should handle errors and log detailed information', async () => {
    // Arrange
    const testError = new Error('Database connection failed')
    testError.name = 'DatabaseError'
    vi.mocked(healthScoreService.calculateAllHealthScores).mockRejectedValue(
      testError
    )

    // Act & Assert
    await expect(runHealthScoreCalculation()).rejects.toThrow(
      'Database connection failed'
    )

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Health score calculation failed'),
      testError
    )
    expect(console.error).toHaveBeenCalledWith('Error name:', 'DatabaseError')
    expect(console.error).toHaveBeenCalledWith(
      'Error message:',
      'Database connection failed'
    )
    expect(console.error).toHaveBeenCalledWith(
      'Error stack:',
      expect.any(String)
    )
  })

  it('should re-throw errors for caller to handle', async () => {
    // Arrange
    const testError = new Error('Test error')
    vi.mocked(healthScoreService.calculateAllHealthScores).mockRejectedValue(
      testError
    )

    // Act & Assert
    await expect(runHealthScoreCalculation()).rejects.toThrow('Test error')
  })

  it('should measure and log execution duration', async () => {
    // Arrange
    vi.mocked(healthScoreService.calculateAllHealthScores).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    // Act
    await runHealthScoreCalculation()

    // Assert
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/completed successfully in \d+ms/)
    )
  })

  it('should log duration even when job fails', async () => {
    // Arrange
    const testError = new Error('Test error')
    vi.mocked(healthScoreService.calculateAllHealthScores).mockImplementation(
      () =>
        new Promise((_, reject) => setTimeout(() => reject(testError), 100))
    )

    // Act & Assert
    await expect(runHealthScoreCalculation()).rejects.toThrow('Test error')

    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(/failed after \d+ms/),
      testError
    )
  })

  it('should handle non-Error exceptions', async () => {
    // Arrange
    vi.mocked(healthScoreService.calculateAllHealthScores).mockRejectedValue(
      'String error'
    )

    // Act & Assert
    await expect(runHealthScoreCalculation()).rejects.toBe('String error')

    // Should still log the error
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Health score calculation failed'),
      'String error'
    )
  })
})
