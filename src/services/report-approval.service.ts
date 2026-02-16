/**
 * Report Approval Service
 * 
 * Handles DoS approval and revocation of report cards
 */

import { prisma } from '@/lib/db';

export class ReportApprovalService {
  /**
   * Approve all report cards for a class
   */
  async approveClassReports(
    classId: string,
    termId: string,
    approvedBy: string
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Get all GENERATED reports for this class and term
      const reports = await prisma.reportCard.findMany({
        where: {
          classId,
          termId,
          status: 'GENERATED'
        }
      });

      if (reports.length === 0) {
        errors.push('No generated reports found for this class');
        return { successCount, failureCount, errors };
      }

      // Approve each report
      for (const report of reports) {
        try {
          await prisma.reportCard.update({
            where: { id: report.id },
            data: {
              status: 'APPROVED',
              approvedAt: new Date(),
              approvedBy
            }
          });
          successCount++;
        } catch (error) {
          failureCount++;
          errors.push(`Failed to approve report ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the approval action
      await prisma.reportGenerationLog.create({
        data: {
          schoolId: reports[0].schoolId,
          classId,
          termId,
          action: 'APPROVED',
          status: failureCount === 0 ? 'SUCCESS' : 'PARTIAL',
          totalStudents: reports.length,
          successCount,
          failureCount,
          generationTime: 0,
          errors: errors.length > 0 ? errors : null,
          performedBy: approvedBy,
          performedAt: new Date()
        }
      });

      return { successCount, failureCount, errors };
    } catch (error) {
      errors.push(`Approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { successCount, failureCount, errors };
    }
  }

  /**
   * Revoke approval for class reports
   */
  async revokeApproval(
    classId: string,
    termId: string,
    revokedBy: string
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Get all APPROVED reports for this class and term
      const reports = await prisma.reportCard.findMany({
        where: {
          classId,
          termId,
          status: 'APPROVED'
        }
      });

      if (reports.length === 0) {
        errors.push('No approved reports found for this class');
        return { successCount, failureCount, errors };
      }

      // Revoke each report
      for (const report of reports) {
        try {
          await prisma.reportCard.update({
            where: { id: report.id },
            data: {
              status: 'GENERATED',
              approvedAt: null,
              approvedBy: null
            }
          });
          successCount++;
        } catch (error) {
          failureCount++;
          errors.push(`Failed to revoke report ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { successCount, failureCount, errors };
    } catch (error) {
      errors.push(`Revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { successCount, failureCount, errors };
    }
  }

  /**
   * Check if class reports can be approved
   */
  async canApproveClassReports(classId: string, termId: string): Promise<{
    canApprove: boolean;
    reason?: string;
  }> {
    // Check if there are any GENERATED reports
    const generatedCount = await prisma.reportCard.count({
      where: {
        classId,
        termId,
        status: 'GENERATED'
      }
    });

    if (generatedCount === 0) {
      return {
        canApprove: false,
        reason: 'No generated reports found. Please generate reports first.'
      };
    }

    return { canApprove: true };
  }

  /**
   * Get approval status for a class
   */
  async getApprovalStatus(classId: string, termId: string) {
    const [total, generated, approved, published] = await Promise.all([
      prisma.reportCard.count({
        where: { classId, termId }
      }),
      prisma.reportCard.count({
        where: { classId, termId, status: 'GENERATED' }
      }),
      prisma.reportCard.count({
        where: { classId, termId, status: 'APPROVED' }
      }),
      prisma.reportCard.count({
        where: { classId, termId, status: 'PUBLISHED' }
      })
    ]);

    return {
      total,
      generated,
      approved,
      published,
      pendingApproval: generated,
      approvalRate: total > 0 ? (approved / total) * 100 : 0
    };
  }
}

// Export singleton instance
export const reportApprovalService = new ReportApprovalService();
