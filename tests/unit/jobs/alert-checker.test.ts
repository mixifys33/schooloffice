/**
 * Alert Checker Background Job Tests
 * 
 * Tests for the alert checking background job
 * Requirements: 5.6 - Background job for hourly alert checking
 */

import { runAlertChecking } from '@/jobs/alert-checker'
import { alertService } from '@/services/alert.service'

// Mock the alert service
vi.mock('@/services/alert.service', () => ({
  alertService: {
    checkAlerts: vi.fn(),
  },
}))

describe('Alert Checker Background Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('runAlertChecking', () => {
    it('should call alertService.checkAlerts', async () => {
      // Arrange
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockResolvedValue(undefined)

      // Act
      await runAlertChecking()

      // Assert
      expect(mockCheckAlerts).toHaveBeenCalledTimes(1)
    })

    it('should log start and completion messages', async () => {
      // Arrange
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockResolvedValue(undefined)
      const consoleLogSpy = vi.spyOn(console, 'log')

      // Act
      await runAlertChecking()

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting alert checking job')
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alert checking completed successfully')
      )
    })

    it('should log duration in completion message', async () => {
      // Arrange
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockResolvedValue(undefined)
      const consoleLogSpy = vi.spyOn(console, 'log')

      // Act
      await runAlertChecking()

      // Assert
      const completionLog = consoleLogSpy.mock.calls.find((call) =>
        call[0].includes('Alert checking completed successfully')
      )
      expect(completionLog).toBeDefined()
      expect(completionLog![0]).toMatch(/in \d+ms/)
    })

    it('should handle errors and log detailed error information', async () => {
      // Arrange
      const mockError = new Error('Database connection failed')
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockRejectedValue(mockError)
      const consoleErrorSpy = vi.spyOn(console, 'error')

      // Act & Assert
      await expect(runAlertChecking()).rejects.toThrow('Database connection failed')

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alert checking failed'),
        mockError
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error name:', 'Error')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error message:',
        'Database connection failed'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error stack:', expect.any(String))
    })

    it('should log duration even when job fails', async () => {
      // Arrange
      const mockError = new Error('Test error')
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockRejectedValue(mockError)
      const consoleErrorSpy = vi.spyOn(console, 'error')

      // Act
      await expect(runAlertChecking()).rejects.toThrow('Test error')

      // Assert
      const errorLog = consoleErrorSpy.mock.calls.find((call) =>
        call[0].includes('Alert checking failed')
      )
      expect(errorLog).toBeDefined()
      expect(errorLog![0]).toMatch(/after \d+ms/)
    })

    it('should re-throw errors to allow caller to handle', async () => {
      // Arrange
      const mockError = new Error('Critical error')
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockRejectedValue(mockError)

      // Act & Assert
      await expect(runAlertChecking()).rejects.toThrow('Critical error')
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockRejectedValue('String error')
      const consoleErrorSpy = vi.spyOn(console, 'error')

      // Act & Assert
      await expect(runAlertChecking()).rejects.toBe('String error')

      // Verify basic error logging (without detailed error info)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alert checking failed'),
        'String error'
      )
      // Should not log Error-specific details
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('Error name:', expect.anything())
    })

    it('should complete successfully when no alerts are found', async () => {
      // Arrange
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockResolvedValue(undefined)
      const consoleLogSpy = vi.spyOn(console, 'log')

      // Act
      await runAlertChecking()

      // Assert
      expect(mockCheckAlerts).toHaveBeenCalledTimes(1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alert checking completed successfully')
      )
    })

    it('should include ISO timestamp in log messages', async () => {
      // Arrange
      const mockCheckAlerts = alertService.checkAlerts as ReturnType<typeof vi.fn>
      mockCheckAlerts.mockResolvedValue(undefined)
      const consoleLogSpy = vi.spyOn(console, 'log')

      // Act
      await runAlertChecking()

      // Assert
      const startLog = consoleLogSpy.mock.calls[0][0]
      const completionLog = consoleLogSpy.mock.calls[1][0]

      // Check for ISO timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(startLog).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
      expect(completionLog).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
    })
  })
})
