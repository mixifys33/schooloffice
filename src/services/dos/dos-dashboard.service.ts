/**
 * DoS Dashboard Service
 * 
 * Main service for Director of Studies dashboard and overview.
 * Provides comprehensive academic management insights and controls.
 * 
 * Requirements:
 * - Academic integrity monitoring
 * - Curriculum compliance tracking
 * - Assessment and exam oversight
 * - Report card management
 * - Teacher performance monitoring
 */

import { prisma } from '@/lib/db';
import { DoSCurriculumService } from './dos-curriculum.service';
import { DoSAssessmentService } from './dos-assessment.service';
import { DoSExamService } from './dos-exam.service';
import { DoSFinalScoreService } from './dos-final-score.service';
import { DoSReportCardService } from './dos-report-card.service';
import { DoSAuditService } from './dos-audit.service';

export interface DoSDashboardOverview {
  curriculumStatus: {
    totalSubjects: number;
    approvedSubjects: number;
    pendingApproval: number;
    approvalRate: number;
  };
  assessmentStatus: {
    totalPlans: number;
    approvedPlans: number;
    overduePlans: number;
    averageCompletion: number;
  };
  examStatus: {
    totalExams: number;
    approvedExams: number;
    pastDueExams: number;
    averageCompletion: number;
  };
  finalScoresStatus: {
    totalScores: number;
    approvedScores: number;
    pendingApproval: number;
    passRate: number;
  };
  reportCardStatus: {
    totalReports: number;
    approvedReports: number;
    publishedReports: number;
    publicationRate: number;
  };
  recentActivity: Array<{
    action: string;
    resourceType: string;
    resourceName: string;
    timestamp: Date;
    userRole: string;
  }>;
  alerts: Array<{
    type: 'WARNING' | 'ERROR' | 'INFO';
    message: string;
    count?: number;
  }>;
}

export class DoSDashboardService {
  private curriculumService: any;
  private assessmentService: any;
  private examService: any;
  private finalScoreService: any;
  private reportCardService: any;
  private auditService: any;

  constructor() {
    // Initialize services with error handling
    try {
      const { DoSCurriculumService } = require('./dos-curriculum.service');
      this.curriculumService = new DoSCurriculumService();
    } catch (error) {
      console.warn('DoS Curriculum Service not available:', error.message);
      this.curriculumService = null;
    }

    try {
      const { DoSAssessmentService } = require('./dos-assessment.service');
      this.assessmentService = new DoSAssessmentService();
    } catch (error) {
      console.warn('DoS Assessment Service not available:', error.message);
      this.assessmentService = null;
    }

    try {
      const { DoSExamService } = require('./dos-exam.service');
      this.examService = new DoSExamService();
    } catch (error) {
      console.warn('DoS Exam Service not available:', error.message);
      this.examService = null;
    }

    try {
      const { DoSFinalScoreService } = require('./dos-final-score.service');
      this.finalScoreService = new DoSFinalScoreService();
    } catch (error) {
      console.warn('DoS Final Score Service not available:', error.message);
      this.finalScoreService = null;
    }

    try {
      const { DoSReportCardService } = require('./dos-report-card.service');
      this.reportCardService = new DoSReportCardService();
    } catch (error) {
      console.warn('DoS Report Card Service not available:', error.message);
      this.reportCardService = null;
    }

    try {
      const { DoSAuditService } = require('./dos-audit.service');
      this.auditService = new DoSAuditService();
    } catch (error) {
      console.warn('DoS Audit Service not available:', error.message);
      this.auditService = null;
    }
  }

  /**
   * Get comprehensive DoS dashboard overview
   */
  async getDashboardOverview(
    schoolId: string,
    termId?: string
  ): Promise<DoSDashboardOverview> {
    // Use current active term if not specified
    if (!termId) {
      const activeTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
            isActive: true
          }
        },
        orderBy: { startDate: 'desc' }
      });
      termId = activeTerm?.id;
    }

    // If still no term found, try to get the most recent term
    if (!termId) {
      const recentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId
          }
        },
        orderBy: { startDate: 'desc' }
      });
      termId = recentTerm?.id;
    }

    // If still no term, return empty dashboard with appropriate message
    if (!termId) {
      return {
        curriculumStatus: {
          totalSubjects: 0,
          approvedSubjects: 0,
          pendingApproval: 0,
          approvalRate: 0
        },
        assessmentStatus: {
          totalPlans: 0,
          approvedPlans: 0,
          overduePlans: 0,
          averageCompletion: 0
        },
        examStatus: {
          totalExams: 0,
          approvedExams: 0,
          pastDueExams: 0,
          averageCompletion: 0
        },
        finalScoresStatus: {
          totalScores: 0,
          approvedScores: 0,
          pendingApproval: 0,
          passRate: 0
        },
        reportCardStatus: {
          totalReports: 0,
          approvedReports: 0,
          publishedReports: 0,
          publicationRate: 0
        },
        recentActivity: [],
        alerts: [{
          type: 'INFO',
          message: 'No academic terms found. Please set up an academic year and terms to begin using the DoS dashboard.'
        }]
      };
    }

    // Get basic data with safe method calls
    try {
      // Get curriculum overview (this method exists)
      const curriculumData = this.curriculumService 
        ? await this.curriculumService.getCurriculumOverview(schoolId).catch(() => ({
            totalSubjects: 0,
            approvedSubjects: 0,
            pendingApproval: 0,
            approvalRate: 0
          }))
        : {
            totalSubjects: 0,
            approvedSubjects: 0,
            pendingApproval: 0,
            approvalRate: 0
          };

      // Get basic assessment data (safe method call)
      const assessmentData = await this.getBasicAssessmentData(schoolId, termId);
      
      // Get basic exam data (safe method call)
      const examData = await this.getBasicExamData(schoolId, termId);
      
      // Get basic final scores data (safe method call)
      const finalScoresData = await this.getBasicFinalScoresData(schoolId, termId);
      
      // Get basic report card data (safe method call)
      const reportCardData = await this.getBasicReportCardData(schoolId, termId);
      
      // Get recent activity (safe method call)
      const activityData = this.auditService 
        ? await this.getRecentActivity(schoolId, 10)
        : [];
      
      // Generate basic alerts
      const alertsData = await this.generateBasicAlerts(schoolId, termId);

      return {
        curriculumStatus: curriculumData,
        assessmentStatus: assessmentData,
        examStatus: examData,
        finalScoresStatus: finalScoresData,
        reportCardStatus: reportCardData,
        recentActivity: activityData,
        alerts: alertsData
      };

    } catch (error) {
      console.error('Error in getDashboardOverview:', error);
      
      // Return basic empty data if everything fails
      return {
        curriculumStatus: {
          totalSubjects: 0,
          approvedSubjects: 0,
          pendingApproval: 0,
          approvalRate: 0
        },
        assessmentStatus: {
          totalPlans: 0,
          approvedPlans: 0,
          overduePlans: 0,
          averageCompletion: 0
        },
        examStatus: {
          totalExams: 0,
          approvedExams: 0,
          pastDueExams: 0,
          averageCompletion: 0
        },
        finalScoresStatus: {
          totalScores: 0,
          approvedScores: 0,
          pendingApproval: 0,
          passRate: 0
        },
        reportCardStatus: {
          totalReports: 0,
          approvedReports: 0,
          publishedReports: 0,
          publicationRate: 0
        },
        recentActivity: [],
        alerts: [{
          type: 'ERROR',
          message: 'Unable to load dashboard data. Some DoS services may not be fully configured.'
        }]
      };
    }
  }

  /**
   * Get basic assessment data using safe database queries
   */
  private async getBasicAssessmentData(schoolId: string, termId: string) {
    try {
      const totalPlans = await prisma.doSAssessmentPlan.count({
        where: {
          curriculumSubject: { schoolId },
          termId
        }
      });

      const approvedPlans = await prisma.doSAssessmentPlan.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          dosApproved: true
        }
      });

      const overduePlans = await prisma.doSAssessmentPlan.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          dueDate: { lt: new Date() },
          dosApproved: false
        }
      });

      const averageCompletion = totalPlans > 0 ? (approvedPlans / totalPlans) * 100 : 0;

      return {
        totalPlans,
        approvedPlans,
        overduePlans,
        averageCompletion
      };
    } catch (error) {
      console.warn('Error getting basic assessment data:', error);
      return {
        totalPlans: 0,
        approvedPlans: 0,
        overduePlans: 0,
        averageCompletion: 0
      };
    }
  }

  /**
   * Get basic exam data using safe database queries
   */
  private async getBasicExamData(schoolId: string, termId: string) {
    try {
      const totalExams = await prisma.doSExam.count({
        where: {
          curriculumSubject: { schoolId },
          termId
        }
      });

      const approvedExams = await prisma.doSExam.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          dosApproved: true
        }
      });

      const pastDueExams = await prisma.doSExam.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          examDate: { lt: new Date() },
          dosApproved: false
        }
      });

      const averageCompletion = totalExams > 0 ? (approvedExams / totalExams) * 100 : 0;

      return {
        totalExams,
        approvedExams,
        pastDueExams,
        averageCompletion
      };
    } catch (error) {
      console.warn('Error getting basic exam data:', error);
      return {
        totalExams: 0,
        approvedExams: 0,
        pastDueExams: 0,
        averageCompletion: 0
      };
    }
  }

  /**
   * Get basic final scores data using safe database queries
   */
  private async getBasicFinalScoresData(schoolId: string, termId: string) {
    try {
      const totalScores = await prisma.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId
        }
      });

      const approvedScores = await prisma.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          dosApproved: true
        }
      });

      const pendingApproval = totalScores - approvedScores;

      const passedScores = await prisma.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          gradeDescriptor: { not: 'FAIL' }
        }
      });

      const passRate = totalScores > 0 ? (passedScores / totalScores) * 100 : 0;

      return {
        totalScores,
        approvedScores,
        pendingApproval,
        passRate
      };
    } catch (error) {
      console.warn('Error getting basic final scores data:', error);
      return {
        totalScores: 0,
        approvedScores: 0,
        pendingApproval: 0,
        passRate: 0
      };
    }
  }

  /**
   * Get basic report card data using safe database queries
   */
  private async getBasicReportCardData(schoolId: string, termId: string) {
    try {
      const totalReports = await prisma.doSReportCard.count({
        where: {
          schoolId,
          termId
        }
      });

      const approvedReports = await prisma.doSReportCard.count({
        where: {
          schoolId,
          termId,
          dosApproved: true
        }
      });

      const publishedReports = await prisma.doSReportCard.count({
        where: {
          schoolId,
          termId,
          status: 'PUBLISHED'
        }
      });

      const publicationRate = totalReports > 0 ? (publishedReports / totalReports) * 100 : 0;

      return {
        totalReports,
        approvedReports,
        publishedReports,
        publicationRate
      };
    } catch (error) {
      console.warn('Error getting basic report card data:', error);
      return {
        totalReports: 0,
        approvedReports: 0,
        publishedReports: 0,
        publicationRate: 0
      };
    }
  }

  /**
   * Get recent DoS activity using safe database queries
   */
  private async getRecentActivity(schoolId: string, limit: number = 10) {
    try {
      // Get recent audit logs if the audit service has the method
      if (!this.auditService) {
        return [];
      }
      
      const activity = await this.auditService.queryLogs({
        schoolId,
        limit,
        offset: 0
      }).catch(() => ({ logs: [] }));

      return activity.logs.map(log => ({
        action: log.action,
        resourceType: log.resourceType,
        resourceName: log.resourceName || 'Unknown',
        timestamp: log.timestamp,
        userRole: log.userRole
      }));
    } catch (error) {
      console.warn('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Generate basic alerts using safe database queries
   */
  private async generateBasicAlerts(schoolId: string, termId: string) {
    const alerts: Array<{
      type: 'WARNING' | 'ERROR' | 'INFO';
      message: string;
      count?: number;
    }> = [];

    try {
      // Check for unapproved curriculum subjects
      const pendingCurriculum = await prisma.doSCurriculumSubject.count({
        where: {
          schoolId,
          dosApproved: false
        }
      });

      if (pendingCurriculum > 0) {
        alerts.push({
          type: 'WARNING',
          message: `${pendingCurriculum} curriculum subjects pending approval`,
          count: pendingCurriculum
        });
      }
    } catch (error) {
      console.warn('Error checking pending curriculum approvals:', error);
    }

    try {
      // Check for overdue assessments
      const overdueAssessments = await prisma.doSAssessmentPlan.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          dueDate: { lt: new Date() },
          dosApproved: false
        }
      });

      if (overdueAssessments > 0) {
        alerts.push({
          type: 'ERROR',
          message: `${overdueAssessments} assessment plans are overdue`,
          count: overdueAssessments
        });
      }
    } catch (error) {
      console.warn('Error checking overdue assessments:', error);
    }

    try {
      // Check for past due exams
      const pastDueExams = await prisma.doSExam.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          examDate: { lt: new Date() },
          dosApproved: false
        }
      });

      if (pastDueExams > 0) {
        alerts.push({
          type: 'ERROR',
          message: `${pastDueExams} exams have incomplete marking`,
          count: pastDueExams
        });
      }
    } catch (error) {
      console.warn('Error checking past due exams:', error);
    }

    // If no alerts, add a positive message
    if (alerts.length === 0) {
      alerts.push({
        type: 'INFO',
        message: 'DoS dashboard is ready. All systems are functioning normally.'
      });
    }

    return alerts;
  }

  // Simplified methods for basic functionality - complex methods removed for now
  // These can be re-added when the underlying services are fully implemented

  /**
   * Basic method stubs - to be implemented when services are ready
   */
  async getClassWorkflowStatus(schoolId: string, classId: string, termId: string) {
    return {
      classId,
      termId,
      workflow: {
        curriculum: { completion: 0, approved: 0, total: 0, status: 'NOT_STARTED' },
        assessments: { completion: 0, approved: 0, total: 0, overdue: 0, status: 'NOT_STARTED' },
        exams: { completion: 0, approved: 0, total: 0, pastDue: 0, status: 'NOT_STARTED' },
        finalScores: { completion: 0, calculated: 0, status: 'NOT_STARTED' },
        reportCards: { completion: 0, published: 0, total: 0, status: 'NOT_STARTED' }
      },
      overallCompletion: 0,
      overallStatus: 'NOT_STARTED'
    };
  }

  async getPerformanceMetrics(schoolId: string, termId: string) {
    return {
      academic: {
        averageScore: 0,
        passRate: 0,
        gradeDistribution: {},
        subjectPerformance: [],
        classPerformance: []
      },
      teacher: {
        assessment: { totalTeachers: 0, averageCompletionRate: 0, underPerforming: 0, overPerforming: 0, teachers: [] },
        marking: { totalTeachers: 0, averageMarkingRate: 0, underPerforming: 0, overPerforming: 0, teachers: [] }
      },
      system: {
        auditActivity: { totalActions: 0, recentActions: 0, actionsByType: {}, actionsByUser: {} },
        criticalActions: { count: 0, recent: [] },
        anomalies: { total: 0, highSeverity: 0, mediumSeverity: 0, unapproved: 0 }
      }
    };
  }

  async getActionItems(schoolId: string, termId: string) {
    return {
      pendingCurriculumApprovals: [],
      overdueAssessments: [],
      pastDueExams: [],
      unapprovedFinalScores: [],
      pendingReportCards: [],
      highSeverityAnomalies: []
    };
  }
}