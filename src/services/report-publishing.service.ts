/**
 * Report Publishing Service
 * 
 * Handles publishing report cards with secure links and guardian notifications
 */

import { prisma } from '@/lib/db';
import crypto from 'crypto';

export class ReportPublishingService {
  /**
   * Publish all approved reports for a class
   */
  async publishClassReports(
    classId: string,
    termId: string,
    publishedBy: string,
    linkExpiryDays: number = 90
  ): Promise<{ successCount: number; failureCount: number; errors: string[]; secureLinks: Array<{ studentId: string; link: string }> }> {
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;
    const secureLinks: Array<{ studentId: string; link: string }> = [];

    try {
      // Get all APPROVED reports for this class and term
      const reports = await prisma.reportCard.findMany({
        where: {
          classId,
          termId,
          status: 'APPROVED'
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true
            }
          }
        }
      });

      if (reports.length === 0) {
        errors.push('No approved reports found for this class');
        return { successCount, failureCount, errors, secureLinks };
      }

      const linkExpiresAt = new Date();
      linkExpiresAt.setDate(linkExpiresAt.getDate() + linkExpiryDays);

      // Publish each report
      for (const report of reports) {
        try {
          // Generate secure token
          const secureToken = this.generateSecureToken();
          
          // Update report
          await prisma.reportCard.update({
            where: { id: report.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              publishedBy,
              secureToken,
              linkExpiresAt
            }
          });

          // Generate secure link
          const secureLink = `/reports/view/${secureToken}`;
          secureLinks.push({
            studentId: report.studentId,
            link: secureLink
          });

          successCount++;
        } catch (error) {
          failureCount++;
          errors.push(`Failed to publish report for ${report.student.firstName} ${report.student.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the publishing action
      await prisma.reportGenerationLog.create({
        data: {
          schoolId: reports[0].schoolId,
          classId,
          termId,
          action: 'PUBLISHED',
          status: failureCount === 0 ? 'SUCCESS' : 'PARTIAL',
          totalStudents: reports.length,
          successCount,
          failureCount,
          generationTime: 0,
          errors: errors.length > 0 ? errors : null,
          performedBy: publishedBy,
          performedAt: new Date()
        }
      });

      return { successCount, failureCount, errors, secureLinks };
    } catch (error) {
      errors.push(`Publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { successCount, failureCount, errors, secureLinks };
    }
  }

  /**
   * Revoke published reports (unpublish)
   */
  async revokePublishedReports(
    classId: string,
    termId: string,
    revokedBy: string
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Get all PUBLISHED reports for this class and term
      const reports = await prisma.reportCard.findMany({
        where: {
          classId,
          termId,
          status: 'PUBLISHED'
        }
      });

      if (reports.length === 0) {
        errors.push('No published reports found for this class');
        return { successCount, failureCount, errors };
      }

      // Revoke each report
      for (const report of reports) {
        try {
          await prisma.reportCard.update({
            where: { id: report.id },
            data: {
              status: 'REVOKED',
              secureToken: null,
              linkExpiresAt: null
            }
          });
          successCount++;
        } catch (error) {
          failureCount++;
          errors.push(`Failed to revoke report ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log the revocation action
      await prisma.reportGenerationLog.create({
        data: {
          schoolId: reports[0].schoolId,
          classId,
          termId,
          action: 'REVOKED',
          status: failureCount === 0 ? 'SUCCESS' : 'PARTIAL',
          totalStudents: reports.length,
          successCount,
          failureCount,
          generationTime: 0,
          errors: errors.length > 0 ? errors : null,
          performedBy: revokedBy,
          performedAt: new Date()
        }
      });

      return { successCount, failureCount, errors };
    } catch (error) {
      errors.push(`Revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { successCount, failureCount, errors };
    }
  }

  /**
   * Generate secure download links for reports
   */
  async generateSecureLinks(
    reportIds: string[],
    expiryDays: number = 90
  ): Promise<Array<{ reportId: string; secureToken: string; link: string }>> {
    const links: Array<{ reportId: string; secureToken: string; link: string }> = [];
    const linkExpiresAt = new Date();
    linkExpiresAt.setDate(linkExpiresAt.getDate() + expiryDays);

    for (const reportId of reportIds) {
      const secureToken = this.generateSecureToken();
      
      await prisma.reportCard.update({
        where: { id: reportId },
        data: {
          secureToken,
          linkExpiresAt
        }
      });

      links.push({
        reportId,
        secureToken,
        link: `/reports/view/${secureToken}`
      });
    }

    return links;
  }

  /**
   * Send notification to guardians (SMS/Email)
   * This will integrate with existing messaging services
   */
  async notifyGuardians(
    classId: string,
    termId: string,
    secureLinks: Array<{ studentId: string; link: string }>
  ): Promise<{ sentCount: number; failedCount: number }> {
    let sentCount = 0;
    let failedCount = 0;

    // TODO: Integrate with SMS/Email services
    // For now, just return counts
    // This will be implemented when integrating with messaging.service.ts

    for (const linkData of secureLinks) {
      try {
        // Get student guardians
        const studentGuardians = await prisma.studentGuardian.findMany({
          where: { studentId: linkData.studentId },
          include: {
            guardian: {
              select: {
                phone: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        // Send SMS/Email to each guardian
        for (const sg of studentGuardians) {
          // TODO: Call SMS service
          // await smsService.send({
          //   to: sg.guardian.phone,
          //   message: `Your child's report card is ready. View it here: ${linkData.link}`
          // });
          
          sentCount++;
        }
      } catch (error) {
        failedCount++;
        console.error(`Failed to notify guardians for student ${linkData.studentId}:`, error);
      }
    }

    return { sentCount, failedCount };
  }

  /**
   * Check if class reports can be published
   */
  async canPublishClassReports(classId: string, termId: string): Promise<{
    canPublish: boolean;
    reason?: string;
  }> {
    // Check if there are any APPROVED reports
    const approvedCount = await prisma.reportCard.count({
      where: {
        classId,
        termId,
        status: 'APPROVED'
      }
    });

    if (approvedCount === 0) {
      return {
        canPublish: false,
        reason: 'No approved reports found. Please approve reports first.'
      };
    }

    return { canPublish: true };
  }

  /**
   * Get publishing status for a class
   */
  async getPublishingStatus(classId: string, termId: string) {
    const [total, approved, published, revoked] = await Promise.all([
      prisma.reportCard.count({
        where: { classId, termId }
      }),
      prisma.reportCard.count({
        where: { classId, termId, status: 'APPROVED' }
      }),
      prisma.reportCard.count({
        where: { classId, termId, status: 'PUBLISHED' }
      }),
      prisma.reportCard.count({
        where: { classId, termId, status: 'REVOKED' }
      })
    ]);

    // Get download statistics
    const publishedReports = await prisma.reportCard.findMany({
      where: { classId, termId, status: 'PUBLISHED' },
      select: {
        downloadCount: true,
        lastDownloadAt: true
      }
    });

    const totalDownloads = publishedReports.reduce((sum, r) => sum + r.downloadCount, 0);
    const averageDownloads = published > 0 ? totalDownloads / published : 0;

    return {
      total,
      approved,
      published,
      revoked,
      pendingPublishing: approved,
      publishRate: total > 0 ? (published / total) * 100 : 0,
      totalDownloads,
      averageDownloads
    };
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify if a secure token is valid and not expired
   */
  async verifySecureToken(token: string): Promise<{
    isValid: boolean;
    reportCard?: any;
    reason?: string;
  }> {
    const reportCard = await prisma.reportCard.findUnique({
      where: { secureToken: token },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true
          }
        },
        class: {
          select: { name: true }
        },
        term: {
          select: { name: true }
        }
      }
    });

    if (!reportCard) {
      return {
        isValid: false,
        reason: 'Invalid or expired link'
      };
    }

    if (reportCard.status !== 'PUBLISHED') {
      return {
        isValid: false,
        reason: 'Report card is no longer available'
      };
    }

    if (reportCard.linkExpiresAt && reportCard.linkExpiresAt < new Date()) {
      return {
        isValid: false,
        reason: 'Link has expired'
      };
    }

    // Increment download count
    await prisma.reportCard.update({
      where: { id: reportCard.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date()
      }
    });

    return {
      isValid: true,
      reportCard
    };
  }
}

// Export singleton instance
export const reportPublishingService = new ReportPublishingService();
