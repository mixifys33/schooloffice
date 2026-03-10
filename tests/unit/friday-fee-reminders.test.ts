/**
 * Unit tests for the guaranteed Friday fee reminders functionality
 * Tests the runGuaranteedFridayFeeReminders method in the FinanceNotificationService
 */

import { financeNotificationService } from '@/services/finance-notification.service';
import { prisma } from '@/lib/db';

// Mock the prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    financeSettings: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    term: {
      findFirst: jest.fn(),
    },
    studentAccount: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    studentMilestoneStatus: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    financeNotificationLog: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('FinanceNotificationService - Friday Fee Reminders', () => {
  const mockSchoolId = 'test-school-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runGuaranteedFridayFeeReminders', () => {
    it('should run when automation is enabled', async () => {
      // Setup mock data
      const mockSettings = {
        enableAutomatedReminders: true,
        fridayOverrideEnabled: false,
        enableGuaranteedFridayReminders: false,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 60 }, { week: 12, percentage: 100 }]),
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      const mockTerm = {
        id: 'test-term-id',
        name: 'Test Term',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        academicYear: { name: 'Test Academic Year' },
      };

      const mockAccounts = [
        {
          id: 'account-1',
          studentId: 'student-1',
          schoolId: mockSchoolId,
          termId: 'test-term-id',
          totalFees: 1000000,
          totalPaid: 0,
          balance: 1000000,
          isExempted: false,
          student: {
            id: 'student-1',
            firstName: 'John',
            lastName: 'Doe',
            admissionNumber: 'ADM001',
            class: { name: 'S1' },
            studentGuardians: [
              {
                guardian: {
                  id: 'guardian-1',
                  phone: '+256781234567',
                  preferredChannel: 'SMS',
                },
              },
            ],
          },
        },
      ];

      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);
      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.studentAccount.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      // Mock the other prisma calls
      (prisma.studentMilestoneStatus.upsert as jest.Mock).mockResolvedValue({
        id: 'tracker-1',
        reminderCount: 0,
        lastReminderSentAt: null,
        status: 'PENDING',
      });
      
      (prisma.financeNotificationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (prisma.financeSettings.update as jest.Mock).mockResolvedValue({});

      // Mock the sendViaChannel method
      const sendViaChannelSpy = jest.spyOn(financeNotificationService, 'sendViaChannel');
      sendViaChannelSpy.mockResolvedValue({ success: true, messageId: 'msg-123' });

      // Run the method with forceRun=true to bypass day check
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, false, true);

      // Assertions
      expect(result.sent).toBeGreaterThan(0);
      expect(prisma.financeSettings.findUnique).toHaveBeenCalledWith({ where: { schoolId: mockSchoolId } });
      expect(sendViaChannelSpy).toHaveBeenCalled();

      // Restore the spy
      sendViaChannelSpy.mockRestore();
    });

    it('should run when fridayOverrideEnabled is true and automation is disabled', async () => {
      // Setup mock data with automation disabled but Friday override enabled
      const mockSettings = {
        enableAutomatedReminders: false,
        fridayOverrideEnabled: true,
        enableGuaranteedFridayReminders: false,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 60 }, { week: 12, percentage: 100 }]),
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      const mockTerm = {
        id: 'test-term-id',
        name: 'Test Term',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        academicYear: { name: 'Test Academic Year' },
      };

      const mockAccounts = [
        {
          id: 'account-1',
          studentId: 'student-1',
          schoolId: mockSchoolId,
          termId: 'test-term-id',
          totalFees: 1000000,
          totalPaid: 0,
          balance: 1000000,
          isExempted: false,
          student: {
            id: 'student-1',
            firstName: 'Jane',
            lastName: 'Smith',
            admissionNumber: 'ADM002',
            class: { name: 'S2' },
            studentGuardians: [
              {
                guardian: {
                  id: 'guardian-2',
                  phone: '+256787654321',
                  preferredChannel: 'SMS',
                },
              },
            ],
          },
        },
      ];

      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);
      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.studentAccount.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      // Mock the other prisma calls
      (prisma.studentMilestoneStatus.upsert as jest.Mock).mockResolvedValue({
        id: 'tracker-1',
        reminderCount: 0,
        lastReminderSentAt: null,
        status: 'PENDING',
      });
      
      (prisma.financeNotificationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (prisma.financeSettings.update as jest.Mock).mockResolvedValue({});

      // Mock the sendViaChannel method
      const sendViaChannelSpy = jest.spyOn(financeNotificationService, 'sendViaChannel');
      sendViaChannelSpy.mockResolvedValue({ success: true, messageId: 'msg-456' });

      // Run the method with forceRun=true to bypass day check
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, false, true);

      // Assertions
      expect(result.sent).toBeGreaterThan(0);
      expect(prisma.financeSettings.findUnique).toHaveBeenCalledWith({ where: { schoolId: mockSchoolId } });
      expect(sendViaChannelSpy).toHaveBeenCalled();

      // Restore the spy
      sendViaChannelSpy.mockRestore();
    });

    it('should run when enableGuaranteedFridayReminders is true and automation is disabled', async () => {
      // Setup mock data with automation disabled but guaranteed Friday enabled
      const mockSettings = {
        enableAutomatedReminders: false,
        fridayOverrideEnabled: false,
        enableGuaranteedFridayReminders: true,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 60 }, { week: 12, percentage: 100 }]),
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      const mockTerm = {
        id: 'test-term-id',
        name: 'Test Term',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        academicYear: { name: 'Test Academic Year' },
      };

      const mockAccounts = [
        {
          id: 'account-1',
          studentId: 'student-1',
          schoolId: mockSchoolId,
          termId: 'test-term-id',
          totalFees: 1000000,
          totalPaid: 0,
          balance: 1000000,
          isExempted: false,
          student: {
            id: 'student-1',
            firstName: 'Bob',
            lastName: 'Johnson',
            admissionNumber: 'ADM003',
            class: { name: 'S3' },
            studentGuardians: [
              {
                guardian: {
                  id: 'guardian-3',
                  phone: '+256771234567',
                  preferredChannel: 'SMS',
                },
              },
            ],
          },
        },
      ];

      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);
      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.studentAccount.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      // Mock the other prisma calls
      (prisma.studentMilestoneStatus.upsert as jest.Mock).mockResolvedValue({
        id: 'tracker-1',
        reminderCount: 0,
        lastReminderSentAt: null,
        status: 'PENDING',
      });
      
      (prisma.financeNotificationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (prisma.financeSettings.update as jest.Mock).mockResolvedValue({});

      // Mock the sendViaChannel method
      const sendViaChannelSpy = jest.spyOn(financeNotificationService, 'sendViaChannel');
      sendViaChannelSpy.mockResolvedValue({ success: true, messageId: 'msg-789' });

      // Run the method with forceRun=true to bypass day check
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, false, true);

      // Assertions
      expect(result.sent).toBeGreaterThan(0);
      expect(prisma.financeSettings.findUnique).toHaveBeenCalledWith({ where: { schoolId: mockSchoolId } });
      expect(sendViaChannelSpy).toHaveBeenCalled();

      // Restore the spy
      sendViaChannelSpy.mockRestore();
    });

    it('should not run when all automation features are disabled', async () => {
      // Setup mock data with all automation features disabled
      const mockSettings = {
        enableAutomatedReminders: false,
        fridayOverrideEnabled: false,
        enableGuaranteedFridayReminders: false,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 60 }, { week: 12, percentage: 100 }]),
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);

      // Run the method with forceRun=false (normal execution)
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, false, false);

      // Assertions - should return with error indicating features are disabled
      expect(result.errors).toContain('Automation and Friday features disabled');
      expect(result.sent).toBe(0);
    });

    it('should handle dry run mode correctly', async () => {
      // Setup mock data
      const mockSettings = {
        enableAutomatedReminders: true,
        fridayOverrideEnabled: false,
        enableGuaranteedFridayReminders: false,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 60 }, { week: 12, percentage: 100 }]),
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      const mockTerm = {
        id: 'test-term-id',
        name: 'Test Term',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        academicYear: { name: 'Test Academic Year' },
      };

      const mockAccounts = [
        {
          id: 'account-1',
          studentId: 'student-1',
          schoolId: mockSchoolId,
          termId: 'test-term-id',
          totalFees: 1000000,
          totalPaid: 0,
          balance: 1000000,
          isExempted: false,
          student: {
            id: 'student-1',
            firstName: 'Alice',
            lastName: 'Brown',
            admissionNumber: 'ADM004',
            class: { name: 'S4' },
            studentGuardians: [
              {
                guardian: {
                  id: 'guardian-4',
                  phone: '+256701234567',
                  preferredChannel: 'SMS',
                },
              },
            ],
          },
        },
      ];

      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);
      (prisma.term.findFirst as jest.Mock).mockResolvedValue(mockTerm);
      (prisma.studentAccount.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      // Mock the other prisma calls
      (prisma.studentMilestoneStatus.upsert as jest.Mock).mockResolvedValue({
        id: 'tracker-1',
        reminderCount: 0,
        lastReminderSentAt: null,
        status: 'PENDING',
      });

      // Mock the sendViaChannel method
      const sendViaChannelSpy = jest.spyOn(financeNotificationService, 'sendViaChannel');
      sendViaChannelSpy.mockResolvedValue({ success: true, messageId: 'msg-101' });

      // Run the method in dry run mode
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, true, false);

      // Assertions - in dry run mode, no actual SMS should be sent
      expect(result.queued).toBeGreaterThan(0); // Messages would be queued in dry run
      expect(result.sent).toBe(0); // No actual sends in dry run
      expect(sendViaChannelSpy).not.toHaveBeenCalled(); // Channel should not be called in dry run

      // Restore the spy
      sendViaChannelSpy.mockRestore();
    });

    it('should validate payment milestones correctly', async () => {
      // Setup mock data with invalid milestones (not totaling 100%)
      const mockSettings = {
        enableAutomatedReminders: true,
        fridayOverrideEnabled: false,
        enableGuaranteedFridayReminders: false,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 50 }]), // Only totals 80%
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);

      // Run the method with forceRun=true to bypass day check
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, false, true);

      // Assertions - should return with error indicating milestones don't total 100%
      expect(result.errors).toContain('Milestones total 80%, must be 100%');
      expect(result.sent).toBe(0);
    });

    it('should handle missing active term', async () => {
      // Setup mock data
      const mockSettings = {
        enableAutomatedReminders: true,
        fridayOverrideEnabled: false,
        enableGuaranteedFridayReminders: false,
        paymentMilestones: JSON.stringify([{ week: 4, percentage: 30 }, { week: 8, percentage: 60 }, { week: 12, percentage: 100 }]),
        gracePeriodDays: 3,
        maxRemindersPerMilestone: 2,
        lockedAt: null,
        lastFridayRunAt: null,
      };

      // Return null for active term (no active term found)
      (prisma.financeSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings);
      (prisma.term.findFirst as jest.Mock).mockResolvedValue(null);

      // Run the method with forceRun=true to bypass day check
      const result = await financeNotificationService.runGuaranteedFridayFeeReminders(mockSchoolId, false, true);

      // Assertions - should return with error indicating no active term
      expect(result.errors).toContain('No active term found');
      expect(result.sent).toBe(0);
    });
  });
});
