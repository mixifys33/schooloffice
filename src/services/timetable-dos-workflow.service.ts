// ============================================
// TIMETABLE DoS WORKFLOW SERVICE
// Integrates timetable generation with DoS authority structure
// ============================================

import { db } from '@/lib/db';
import { TimetableService } from './timetable.service';
import { 
  TimetableDraft, 
  TimetableStatus, 
  GenerateTimetableRequest,
  GenerateTimetableResponse,
  TimetableConflict,
  ConflictSeverity
} from '@/types/timetable';

export class TimetableDosWorkflowService {
  
  // ============================================
  // DoS AUTHORITY VALIDATION
  // ============================================

  static async validateDosAuthority(userId: string, schoolId: string): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { staff: true }
      });

      if (!user || user.schoolId !== schoolId) return false;
      
      // Check if user has DoS role
      return user.roles.includes('DOS') || user.role === 'DOS';
    } catch (error) {
      console.error('Error validating DoS authority:', error);
      return false;
    }
  }

  // ============================================
  // TIMETABLE GENERATION WITH DoS WORKFLOW
  // ============================================

  static async generateTimetableAsDos(
    request: GenerateTimetableRequest & { dosUserId: string }
  ): Promise<GenerateTimetableResponse> {
    // Validate DoS authority
    const hasAuthority = await this.validateDosAuthority(request.dosUserId, request.schoolId);
    if (!hasAuthority) {
      return {
        success: false,
        message: 'Only Director of Studies can generate timetables',
        generationTime: 0,
        conflicts: []
      };
    }

    // Check if there's an active published timetable for this term
    const existingPublished = await db.timetableDraft.findFirst({
      where: {
        schoolId: request.schoolId,
        termId: request.termId,
        status: TimetableStatus.PUBLISHED
      }
    });

    if (existingPublished) {
      return {
        success: false,
        message: 'Cannot generate new timetable while another is published. Unpublish first.',
        generationTime: 0,
        conflicts: []
      };
    }

    // Generate timetable using core service
    const result = await TimetableService.generateTimetable(request);
    
    if (result.success && result.timetableId) {
      // Update the draft with DoS information
      await db.timetableDraft.update({
        where: { id: result.timetableId },
        data: {
          generatedBy: request.dosUserId
        }
      });

      // Log the generation action
      await this.logTimetableAction({
        schoolId: request.schoolId,
        timetableId: result.timetableId,
        action: 'GENERATED',
        performedBy: request.dosUserId,
        details: {
          qualityScore: result.qualityScore,
          conflictCount: result.conflicts.length,
          generationTime: result.generationTime
        }
      });
    }

    return result;
  }

  // ============================================
  // APPROVAL WORKFLOW
  // ============================================

  static async reviewTimetable(
    timetableId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId }
      });

      if (!draft) {
        return { success: false, message: 'Timetable not found' };
      }

      // Validate DoS authority
      const hasAuthority = await this.validateDosAuthority(reviewedBy, draft.schoolId);
      if (!hasAuthority) {
        return { success: false, message: 'Only Director of Studies can review timetables' };
      }

      if (draft.status !== TimetableStatus.DRAFT) {
        return { success: false, message: 'Only draft timetables can be reviewed' };
      }

      // Update to reviewed status
      await db.timetableDraft.update({
        where: { id: timetableId },
        data: {
          status: TimetableStatus.REVIEWED,
          reviewedBy,
          reviewedAt: new Date(),
          reviewNotes
        }
      });

      // Log the review action
      await this.logTimetableAction({
        schoolId: draft.schoolId,
        timetableId,
        action: 'REVIEWED',
        performedBy: reviewedBy,
        details: { reviewNotes }
      });

      return { success: true, message: 'Timetable reviewed successfully' };
    } catch (error) {
      console.error('Error reviewing timetable:', error);
      return { success: false, message: 'Failed to review timetable' };
    }
  }

  static async approveTimetable(
    timetableId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId },
        include: { conflicts: true }
      });

      if (!draft) {
        return { success: false, message: 'Timetable not found' };
      }

      // Validate DoS authority
      const hasAuthority = await this.validateDosAuthority(approvedBy, draft.schoolId);
      if (!hasAuthority) {
        return { success: false, message: 'Only Director of Studies can approve timetables' };
      }

      if (draft.status !== TimetableStatus.REVIEWED) {
        return { success: false, message: 'Timetable must be reviewed before approval' };
      }

      // Check for critical conflicts
      const criticalConflicts = draft.conflicts.filter((c: any) => c.severity === ConflictSeverity.CRITICAL);
      if (criticalConflicts.length > 0) {
        return { 
          success: false, 
          message: `Cannot approve timetable with ${criticalConflicts.length} critical conflicts. Resolve them first.` 
        };
      }

      // Update to approved status
      await db.timetableDraft.update({
        where: { id: timetableId },
        data: {
          status: TimetableStatus.APPROVED,
          approvedBy,
          approvedAt: new Date(),
          approvalNotes
        }
      });

      // Create version history
      await this.createVersionHistory(timetableId, 'APPROVED', approvedBy);

      // Log the approval action
      await this.logTimetableAction({
        schoolId: draft.schoolId,
        timetableId,
        action: 'APPROVED',
        performedBy: approvedBy,
        details: { approvalNotes }
      });

      return { success: true, message: 'Timetable approved successfully' };
    } catch (error) {
      console.error('Error approving timetable:', error);
      return { success: false, message: 'Failed to approve timetable' };
    }
  }

  static async publishTimetable(
    timetableId: string,
    publishedBy: string,
    notificationSettings?: {
      notifyTeachers: boolean;
      notifyStudents: boolean;
      notifyParents: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId }
      });

      if (!draft) {
        return { success: false, message: 'Timetable not found' };
      }

      // Validate DoS authority
      const hasAuthority = await this.validateDosAuthority(publishedBy, draft.schoolId);
      if (!hasAuthority) {
        return { success: false, message: 'Only Director of Studies can publish timetables' };
      }

      if (draft.status !== TimetableStatus.APPROVED) {
        return { success: false, message: 'Only approved timetables can be published' };
      }

      // Check if another timetable is already published for this term
      const existingPublished = await db.timetableDraft.findFirst({
        where: {
          schoolId: draft.schoolId,
          termId: draft.termId,
          status: TimetableStatus.PUBLISHED,
          id: { not: timetableId }
        }
      });

      if (existingPublished) {
        return { 
          success: false, 
          message: 'Another timetable is already published for this term. Unpublish it first.' 
        };
      }

      // Update to published status
      await db.timetableDraft.update({
        where: { id: timetableId },
        data: {
          status: TimetableStatus.PUBLISHED,
          publishedAt: new Date()
        }
      });

      // Log publication
      await db.timetablePublicationLog.create({
        data: {
          schoolId: draft.schoolId,
          timetableId,
          action: 'PUBLISHED',
          performedBy: publishedBy,
          performedAt: new Date()
        }
      });

      // Create version history
      await this.createVersionHistory(timetableId, 'PUBLISHED', publishedBy);

      // Send notifications if requested
      if (notificationSettings) {
        await this.sendTimetableNotifications(timetableId, notificationSettings);
      }

      // Log the publication action
      await this.logTimetableAction({
        schoolId: draft.schoolId,
        timetableId,
        action: 'PUBLISHED',
        performedBy: publishedBy,
        details: { notificationSettings }
      });

      return { success: true, message: 'Timetable published successfully' };
    } catch (error) {
      console.error('Error publishing timetable:', error);
      return { success: false, message: 'Failed to publish timetable' };
    }
  }

  static async unpublishTimetable(
    timetableId: string,
    unpublishedBy: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId }
      });

      if (!draft) {
        return { success: false, message: 'Timetable not found' };
      }

      // Validate DoS authority
      const hasAuthority = await this.validateDosAuthority(unpublishedBy, draft.schoolId);
      if (!hasAuthority) {
        return { success: false, message: 'Only Director of Studies can unpublish timetables' };
      }

      if (draft.status !== TimetableStatus.PUBLISHED) {
        return { success: false, message: 'Only published timetables can be unpublished' };
      }

      // Update status back to approved
      await db.timetableDraft.update({
        where: { id: timetableId },
        data: {
          status: TimetableStatus.APPROVED,
          publishedAt: null
        }
      });

      // Log unpublication
      await db.timetablePublicationLog.create({
        data: {
          schoolId: draft.schoolId,
          timetableId,
          action: 'UNPUBLISHED',
          performedBy: unpublishedBy,
          reason,
          performedAt: new Date()
        }
      });

      // Log the unpublication action
      await this.logTimetableAction({
        schoolId: draft.schoolId,
        timetableId,
        action: 'UNPUBLISHED',
        performedBy: unpublishedBy,
        details: { reason }
      });

      return { success: true, message: 'Timetable unpublished successfully' };
    } catch (error) {
      console.error('Error unpublishing timetable:', error);
      return { success: false, message: 'Failed to unpublish timetable' };
    }
  }

  // ============================================
  // CONFLICT RESOLUTION WITH DoS AUTHORITY
  // ============================================

  static async resolveConflict(
    conflictId: string,
    resolvedBy: string,
    resolutionMethod: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const conflict = await db.timetableConflict.findUnique({
        where: { id: conflictId },
        include: { timetable: true }
      });

      if (!conflict) {
        return { success: false, message: 'Conflict not found' };
      }

      // Validate DoS authority
      const hasAuthority = await this.validateDosAuthority(resolvedBy, conflict.timetable.schoolId);
      if (!hasAuthority) {
        return { success: false, message: 'Only Director of Studies can resolve conflicts' };
      }

      // Update conflict as resolved
      await db.timetableConflict.update({
        where: { id: conflictId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          resolutionMethod
        }
      });

      // Log the resolution
      await this.logTimetableAction({
        schoolId: conflict.timetable.schoolId,
        timetableId: conflict.timetableId,
        action: 'CONFLICT_RESOLVED',
        performedBy: resolvedBy,
        details: { conflictId, resolutionMethod }
      });

      return { success: true, message: 'Conflict resolved successfully' };
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return { success: false, message: 'Failed to resolve conflict' };
    }
  }

  static async dismissConflict(
    conflictId: string,
    dismissedBy: string,
    dismissalReason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const conflict = await db.timetableConflict.findUnique({
        where: { id: conflictId },
        include: { timetable: true }
      });

      if (!conflict) {
        return { success: false, message: 'Conflict not found' };
      }

      // Validate DoS authority
      const hasAuthority = await this.validateDosAuthority(dismissedBy, conflict.timetable.schoolId);
      if (!hasAuthority) {
        return { success: false, message: 'Only Director of Studies can dismiss conflicts' };
      }

      // Only allow dismissal of non-critical conflicts
      if (conflict.severity === ConflictSeverity.CRITICAL) {
        return { success: false, message: 'Critical conflicts cannot be dismissed, they must be resolved' };
      }

      // Update conflict as dismissed
      await db.timetableConflict.update({
        where: { id: conflictId },
        data: {
          dismissedAt: new Date(),
          dismissedBy,
          dismissalReason
        }
      });

      // Log the dismissal
      await this.logTimetableAction({
        schoolId: conflict.timetable.schoolId,
        timetableId: conflict.timetableId,
        action: 'CONFLICT_DISMISSED',
        performedBy: dismissedBy,
        details: { conflictId, dismissalReason }
      });

      return { success: true, message: 'Conflict dismissed successfully' };
    } catch (error) {
      console.error('Error dismissing conflict:', error);
      return { success: false, message: 'Failed to dismiss conflict' };
    }
  }

  // ============================================
  // TIMETABLE ACCESS CONTROL
  // ============================================

  static async getTimetableForRole(
    timetableId: string,
    userId: string,
    role: string
  ): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { staff: true }
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const timetable = await db.timetableDraft.findUnique({
        where: { id: timetableId },
        include: {
          slots: {
            include: {
              class: true,
              subject: true,
              teacher: true
            }
          }
        }
      });

      if (!timetable) {
        return { success: false, message: 'Timetable not found' };
      }

      // Check if timetable is published (unless user is DoS)
      if (timetable.status !== TimetableStatus.PUBLISHED && !user.roles.includes('DOS')) {
        return { success: false, message: 'Timetable is not yet published' };
      }

      // Filter slots based on role
      let filteredSlots = timetable.slots;

      switch (role) {
        case 'TEACHER':
          // Teachers see only their own lessons
          filteredSlots = timetable.slots.filter((slot: any) => slot.teacherId === user.staff?.id);
          break;
        
        case 'STUDENT':
          // Students see their class timetable
          // Would need to get student's class from student record
          break;
        
        case 'PARENT':
          // Parents see their child's class timetable
          // Would need to get child's class from guardian-student relationship
          break;
        
        case 'DOS':
        case 'SCHOOL_ADMIN':
          // DoS and School Admin see everything
          break;
        
        default:
          filteredSlots = [];
      }

      return {
        success: true,
        data: {
          ...timetable,
          slots: filteredSlots
        },
        message: 'Timetable retrieved successfully'
      };
    } catch (error) {
      console.error('Error getting timetable for role:', error);
      return { success: false, message: 'Failed to retrieve timetable' };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private static async createVersionHistory(
    timetableId: string,
    action: string,
    userId: string
  ): Promise<void> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId },
        include: { slots: true, conflicts: true }
      });

      if (!draft) return;

      await db.timetableVersion.create({
        data: {
          schoolId: draft.schoolId,
          termId: draft.termId,
          version: draft.version,
          status: draft.status,
          changedBy: userId,
          changeReason: `Timetable ${action.toLowerCase()}`,
          totalSlots: draft.slots?.length || 0,
          conflictCount: draft.conflicts?.length || 0,
          qualityScore: draft.qualityScore,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error creating version history:', error);
    }
  }

  private static async logTimetableAction(data: {
    schoolId: string;
    timetableId: string;
    action: string;
    performedBy: string;
    details?: any;
  }): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          schoolId: data.schoolId,
          userId: data.performedBy,
          action: `TIMETABLE_${data.action}`,
          resourceType: 'Timetable',
          resourceId: data.timetableId,
          newValue: data.details ? JSON.stringify(data.details) : null,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error logging timetable action:', error);
    }
  }

  private static async sendTimetableNotifications(
    timetableId: string,
    settings: {
      notifyTeachers: boolean;
      notifyStudents: boolean;
      notifyParents: boolean;
    }
  ): Promise<void> {
    try {
      // This would integrate with your messaging system
      // For now, just log the notification intent
      console.log(`Sending timetable notifications for ${timetableId}:`, settings);
      
      // TODO: Implement actual notification sending
      // - Get all teachers for the school
      // - Get all students and their guardians
      // - Send SMS/Email notifications about new timetable
      // - Use your existing messaging templates
    } catch (error) {
      console.error('Error sending timetable notifications:', error);
    }
  }
}