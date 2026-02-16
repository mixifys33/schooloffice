/**
 * TIMETABLE APPROVAL WORKFLOW SERVICE
 * 
 * Integrates the constraint engine with DoS authority structure.
 * Handles the complete workflow from draft to publication.
 *     
 * Authority Structure:
 * - DoS: Absolute authority over timetables
 * - Head Teacher: Final oversight (view only)
 * - Teachers: View personal timetable only
 * - Admin: Printing, publishing support
 * 
 * Workflow States:
 * DRAFT -> REVIEWED -> APPROVED -> PUBLISHED -> ARCHIVED
 */

import { db } from '@/lib/db';
import { timetableConstraintEngine, ConstraintViolation } from './timetable-constraint-engine.service';
import { TimetableStatus, ConflictSeverity } from '@/types/timetable';
import type {
  TimetableDraft,
  TimetableSlot,
  TimetableApproval
} from '@prisma/client';

interface GenerationRequest {
  schoolId: string;
  termId: string;
  dosUserId: string;
  name: string;
  regenerateFrom?: string; // Existing draft ID to modify
  settings?: {
    populationSize?: number;
    maxGenerations?: number;
    mutationRate?: number;
    crossoverRate?: number;
  };
}

interface ApprovalRequest {
  draftId: string;
  dosUserId: string;
  reviewNotes?: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
}

interface PublicationRequest {
  draftId: string;
  dosUserId: string;
  notifyTeachers?: boolean;
  notifyStudents?: boolean;
}

interface TimetableAnalytics {
  totalSlots: number;
  filledSlots: number;
  conflictCount: number;
  qualityScore: number;
  teacherWorkload: {
    avgPeriodsPerTeacher: number;
    overloadedTeachers: number;
    underloadedTeachers: number;
  };
  roomUtilization: {
    avgUtilization: number;
    underutilizedRooms: number;
  };
  subjectDistribution: {
    balanceScore: number;
    unevenClasses: number;
  };
}

export class TimetableApprovalWorkflowService {
  
  // ============================================
  // GENERATION PHASE (DoS ONLY)
  // ============================================
  
  async generateTimetableDraft(request: GenerationRequest): Promise<TimetableDraft> {
    // Verify DoS authority
    await this.verifyDosAuthority(request.dosUserId, request.schoolId);
    
    console.log(`DoS ${request.dosUserId} initiating timetable generation for term ${request.termId}`);
    
    // Create draft record
    const draft = await db.timetableDraft.create({
      data: {
        schoolId: request.schoolId,
        termId: request.termId,
        name: request.name,
        generationStatus: 'RUNNING',
        generationStarted: new Date(),
        status: 'DRAFT',
        generatedBy: request.dosUserId
      }
    });

    try {
      // Run constraint engine
      const solution = await timetableConstraintEngine.generateTimetable(
        request.schoolId,
        request.termId,
        request.settings
      );

      // Save slots to database
      await this.saveSolutionSlots(draft.id, solution.slots);
      
      // Calculate analytics
      const analytics = await this.calculateAnalytics(draft.id, solution);
      
      // Update draft with results
      const updatedDraft = await db.timetableDraft.update({
        where: { id: draft.id },
        data: {
          generationStatus: 'COMPLETED',
          generationEnded: new Date(),
          totalSlots: analytics.totalSlots,
          filledSlots: analytics.filledSlots,
          conflictCount: analytics.conflictCount,
          qualityScore: analytics.qualityScore,
          hardConstraintViolations: solution.violations.filter(v => v.severity === 'CRITICAL').length,
          softConstraintViolations: solution.violations.filter(v => v.severity !== 'CRITICAL').length,
          generationLog: JSON.parse(JSON.stringify({
            settings: request.settings,
            analytics: analytics,
            violations: solution.violations,
            generatedAt: new Date().toISOString()
          }))
        }
      });

      // Log conflicts if any
      if (solution.violations.length > 0) {
        await this.logConflicts(draft.id, solution.violations);
      }

      console.log(`Timetable generation completed. Quality score: ${analytics.qualityScore.toFixed(2)}`);
      return updatedDraft;

    } catch (error) {
      // Mark generation as failed
      await db.timetableDraft.update({
        where: { id: draft.id },
        data: {
          generationStatus: 'FAILED',
          generationEnded: new Date(),
          generationLog: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date()
          }
        }
      });
      
      throw error;
    }
  }

  // ============================================
  // MANUAL ADJUSTMENT PHASE (DoS ONLY)
  // ============================================
  
  async adjustTimetableSlot(
    draftId: string,
    slotId: string,
    updates: Partial<TimetableSlot>,
    dosUserId: string
  ): Promise<TimetableSlot> {
    // Verify DoS authority and draft ownership
    const draft = await this.verifyDraftAccess(draftId, dosUserId);
    
    if (draft.status !== 'DRAFT') {
      throw new Error('Cannot modify timetable after approval. Create new version.');
    }

    // Update slot
    const updatedSlot = await db.timetableSlot.update({
      where: { id: slotId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    // Recheck conflicts for this slot
    await this.recheckSlotConflicts(draftId, slotId);
    
    // Update draft modification timestamp
    await db.timetableDraft.update({
      where: { id: draftId },
      data: { updatedAt: new Date() }
    });

    return updatedSlot;
  }

  async swapTimetableSlots(
    draftId: string,
    slot1Id: string,
    slot2Id: string,
    dosUserId: string
  ): Promise<void> {
    const draft = await this.verifyDraftAccess(draftId, dosUserId);
    
    if (draft.status !== 'DRAFT') {
      throw new Error('Cannot modify approved timetable');
    }

    const [slot1, slot2] = await Promise.all([
      db.timetableSlot.findUnique({ where: { id: slot1Id } }),
      db.timetableSlot.findUnique({ where: { id: slot2Id } })
    ]);

    if (!slot1 || !slot2) {
      throw new Error('Slots not found');
    }

    // Swap time slots
    await db.$transaction([
      db.timetableSlot.update({
        where: { id: slot1Id },
        data: {
          dayOfWeek: slot2.dayOfWeek,
          period: slot2.period,
          updatedAt: new Date()
        }
      }),
      db.timetableSlot.update({
        where: { id: slot2Id },
        data: {
          dayOfWeek: slot1.dayOfWeek,
          period: slot1.period,
          updatedAt: new Date()
        }
      })
    ]);

    // Recheck conflicts
    await Promise.all([
      this.recheckSlotConflicts(draftId, slot1Id),
      this.recheckSlotConflicts(draftId, slot2Id)
    ]);
  }

  // ============================================
  // CONFLICT DETECTION & RESOLUTION
  // ============================================
  
  async detectAllConflicts(draftId: string): Promise<ConstraintViolation[]> {
    const slots = await db.timetableSlot.findMany({
      where: { timetableId: draftId },
      include: {
        class: true,
        subject: true,
        teacher: true,
        room: true
      }
    });

    // Get draft to get schoolId and termId
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId },
      select: { schoolId: true, termId: true }
    });

    const solution = {
      slots,
      schoolId: draft?.schoolId || '',
      termId: draft?.termId || '',
      violations: []
    };

    const violations = await timetableConstraintEngine.validateSolution(solution);
    
    // Update conflict logs
    await this.logConflicts(draftId, violations);
    
    return violations;
  }

  async suggestConflictResolutions(draftId: string, conflictId: string): Promise<string[]> {
    const conflict = await db.timetableConflictLog.findUnique({
      where: { id: conflictId }
    });

    if (!conflict) {
      throw new Error('Conflict not found');
    }

    // Generate context-aware suggestions
    const suggestions: string[] = [];
    
    switch (conflict.conflictType) {
      case 'TEACHER_CLASH':
        suggestions.push(
          'Move one class to a different time slot',
          'Assign a different qualified teacher',
          'Split the class if possible',
          'Use team teaching approach'
        );
        break;
        
      case 'ROOM_CLASH':
        suggestions.push(
          'Move one class to an available room',
          'Reschedule one class to a different time',
          'Use alternative room if subject allows',
          'Consider outdoor/flexible space'
        );
        break;
        
      case 'SUBJECT_OVERLOAD':
        suggestions.push(
          'Redistribute periods across the week',
          'Combine some periods into double periods',
          'Review subject period requirements',
          'Consider reducing non-core subjects'
        );
        break;
        
      default:
        suggestions.push('Review timetable constraints and requirements');
    }

    return suggestions;
  }

  // ============================================
  // APPROVAL WORKFLOW
  // ============================================
  
  async submitForReview(draftId: string, dosUserId: string): Promise<TimetableApproval> {
    const draft = await this.verifyDraftAccess(draftId, dosUserId);
    
    // Check if draft has critical conflicts
    const criticalConflicts = await db.timetableConflictLog.count({
      where: {
        timetableId: draftId,
        severity: ConflictSeverity.CRITICAL,
        isResolved: false
      }
    });

    if (criticalConflicts > 0) {
      throw new Error(`Cannot submit timetable with ${criticalConflicts} unresolved critical conflicts`);
    }

    // Update draft status
    await db.timetableDraft.update({
      where: { id: draftId },
      data: { status: 'REVIEWED' }
    });

    // Create approval record
    const approval = await db.timetableApproval.create({
      data: {
        schoolId: draft.schoolId,
        draftId,
        submittedBy: dosUserId,
        submittedAt: new Date()
      }
    });

    return approval;
  }

  async reviewTimetable(request: ApprovalRequest): Promise<TimetableApproval> {
    await this.verifyDosAuthority(request.dosUserId, ''); // Will verify in the draft check
    
    const approval = await db.timetableApproval.findUnique({
      where: { draftId: request.draftId },
      include: { draft: true }
    });

    if (!approval) {
      throw new Error('Approval record not found');
    }

    const updateData: {
      reviewedBy: string;
      reviewedAt: Date;
      reviewStatus: string;
      reviewNotes?: string;
    } = {
      reviewedBy: request.dosUserId,
      reviewedAt: new Date(),
      reviewStatus: request.action,
      reviewNotes: request.reviewNotes
    };

    // Update draft status based on action
    let draftStatus: TimetableStatus;
    switch (request.action) {
      case 'APPROVE':
        draftStatus = TimetableStatus.APPROVED;
        break;
      case 'REJECT':
        draftStatus = TimetableStatus.DRAFT;
        break;
      case 'REQUEST_CHANGES':
        draftStatus = TimetableStatus.DRAFT;
        break;
    }

    // Update both approval and draft
    const [updatedApproval] = await db.$transaction([
      db.timetableApproval.update({
        where: { id: approval.id },
        data: updateData
      }),
      db.timetableDraft.update({
        where: { id: request.draftId },
        data: { status: draftStatus }
      })
    ]);

    return updatedApproval;
  }

  // ============================================
  // PUBLICATION PHASE
  // ============================================
  
  async publishTimetable(request: PublicationRequest): Promise<void> {
    await this.verifyDosAuthority(request.dosUserId, '');
    
    const draft = await db.timetableDraft.findUnique({
      where: { id: request.draftId },
      include: { approval: true }
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    if (draft.status !== 'APPROVED') {
      throw new Error('Only approved timetables can be published');
    }

    // Archive any existing published timetable for this term
    await db.timetableDraft.updateMany({
      where: {
        schoolId: draft.schoolId,
        termId: draft.termId,
        status: 'PUBLISHED'
      },
      data: { status: 'ARCHIVED' }
    });

    // Publish this timetable
    await db.timetableDraft.update({
      where: { id: request.draftId },
      data: { status: 'PUBLISHED' }
    });

    // Sync to live TimetableEntry table for dashboard/attendance
    await this.syncToLiveTimetable(request.draftId);

    // Update approval record
    if (draft.approval) {
      await db.timetableApproval.update({
        where: { id: draft.approval.id },
        data: {
          publishedBy: request.dosUserId,
          publishedAt: new Date(),
          teachersNotified: request.notifyTeachers || false,
          studentsNotified: request.notifyStudents || false
        }
      });
    }

    // Log publication
    await db.timetablePublicationLog.create({
      data: {
        schoolId: draft.schoolId,
        timetableId: draft.id,
        action: 'PUBLISHED',
        performedBy: request.dosUserId,
        performedAt: new Date(),
        notificationsSent: request.notifyTeachers || request.notifyStudents || false
      }
    });

    // Send notifications if requested
    if (request.notifyTeachers) {
      await this.notifyTeachers(draft.schoolId, draft.id);
    }
    
    if (request.notifyStudents) {
      await this.notifyStudents(draft.schoolId, draft.id);
    }
  }

  async unpublishTimetable(draftId: string, dosUserId: string, reason: string): Promise<void> {
    await this.verifyDosAuthority(dosUserId, '');
    
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId }
    });

    if (!draft || draft.status !== 'PUBLISHED') {
      throw new Error('Timetable is not published');
    }

    await db.timetableDraft.update({
      where: { id: draftId },
      data: { status: 'APPROVED' } // Back to approved state
    });

    // Log unpublication
    await db.timetablePublicationLog.create({
      data: {
        schoolId: draft.schoolId,
        timetableId: draft.id,
        action: 'UNPUBLISHED',
        performedBy: dosUserId,
        reason,
        performedAt: new Date()
      }
    });
  }

  // ============================================
  // VERSIONING & HISTORY
  // ============================================
  
  async createNewVersion(
    originalDraftId: string,
    dosUserId: string,
    changeReason: string
  ): Promise<TimetableDraft> {
    const originalDraft = await this.verifyDraftAccess(originalDraftId, dosUserId);
    
    // Get next version number
    const existingVersions = await db.timetableVersion.count({
      where: {
        schoolId: originalDraft.schoolId,
        termId: originalDraft.termId
      }
    });

    // Create version record of original
    await db.timetableVersion.create({
      data: {
        schoolId: originalDraft.schoolId,
        termId: originalDraft.termId,
        version: existingVersions + 1,
        status: originalDraft.status,
        changedBy: dosUserId,
        changeReason,
        changesFrom: originalDraftId,
        totalSlots: originalDraft.totalSlots,
        conflictCount: originalDraft.conflictCount,
        qualityScore: originalDraft.qualityScore
      }
    });

    // Create new draft based on original
    const newDraft = await db.timetableDraft.create({
      data: {
        schoolId: originalDraft.schoolId,
        termId: originalDraft.termId,
        name: `${originalDraft.name} v${existingVersions + 2}`,
        status: 'DRAFT',
        generatedBy: dosUserId,
        generationStatus: 'IDLE'
      }
    });

    // Copy slots from original
    const originalSlots = await db.timetableSlot.findMany({
      where: { timetableId: originalDraftId }
    });

    if (originalSlots.length > 0) {
      await db.timetableSlot.createMany({
        data: originalSlots.map((slot) => ({
          timetableId: newDraft.id,
          schoolId: originalDraft.schoolId,
          dayOfWeek: slot.dayOfWeek,
          period: slot.period,
          classId: slot.classId,
          subjectId: slot.subjectId,
          teacherId: slot.teacherId,
          roomId: slot.roomId,
          isDoubleSlot: slot.isDoubleSlot || false,
          notes: slot.notes
        }))
      });
    }

    return newDraft;
  }

  // ============================================
  // ACCESS CONTROL & ANALYTICS
  // ============================================
  
  async getTimetableForRole(
    draftId: string,
    userId: string,
    role: string
  ): Promise<TimetableDraft & { slots: TimetableSlot[] }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { staff: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId },
      include: {
        slots: true
      }
    });

    if (!draft) {
      throw new Error('Timetable not found');
    }

    // Filter based on role
    switch (role) {
      case 'DOS':
        // DoS sees everything
        return draft;
        
      case 'TEACHER':
        // Teachers see only their lessons
        if (!user.staff) {
          throw new Error('Staff record not found');
        }
        
        return {
          ...draft,
          slots: draft.slots.filter((slot) => slot.teacherId === user.staff!.id)
        };
        
      case 'CLASS_TEACHER':
        // Class teachers see their class timetable
        if (!user.staff) {
          throw new Error('Staff record not found');
        }
        
        const staffClasses = await db.staffClass.findMany({
          where: { staffId: user.staff.id }
        });
        
        const classIds = staffClasses.map((sc) => sc.classId);
        
        return {
          ...draft,
          slots: draft.slots.filter((slot) => classIds.includes(slot.classId))
        };
        
      case 'SCHOOL_ADMIN':
        // Admin sees published timetables only
        if (draft.status !== 'PUBLISHED') {
          throw new Error('Timetable not published');
        }
        return draft;
        
      default:
        throw new Error('Unauthorized access');
    }
  }

  async getTimetableAnalytics(draftId: string, dosUserId: string): Promise<TimetableAnalytics> {
    await this.verifyDosAuthority(dosUserId, '');
    
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId },
      include: {
        slots: true
      }
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    return this.calculateAnalytics(draftId, { 
      slots: draft.slots,
      violations: []
    });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================
  
  private async verifyDosAuthority(userId: string, schoolId?: string): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { staff: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.roles.includes('DOS') && user.role !== 'DOS') {
      throw new Error('Only Director of Studies can perform this action');
    }

    if (schoolId && user.schoolId !== schoolId) {
      throw new Error('User does not belong to this school');
    }
  }

  private async verifyDraftAccess(draftId: string, userId: string): Promise<TimetableDraft> {
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId }
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    await this.verifyDosAuthority(userId, draft.schoolId);
    
    return draft;
  }

  private async saveSolutionSlots(draftId: string, slots: TimetableSlot[]): Promise<TimetableSlot[]> {
    // Get draft to get schoolId
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId },
      select: { schoolId: true }
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    const slotData = slots.map(slot => ({
      timetableId: draftId,
      schoolId: draft.schoolId,
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      roomId: slot.roomId,
      isDoubleSlot: slot.isDoubleSlot || false,
      notes: slot.notes
    }));

    await db.timetableSlot.createMany({
      data: slotData
    });

    return db.timetableSlot.findMany({
      where: { timetableId: draftId }
    });
  }

  private async calculateAnalytics(_draftId: string, solution: { slots: TimetableSlot[]; violations?: ConstraintViolation[]; qualityScore?: number }): Promise<TimetableAnalytics> {
    const slots = solution.slots;
    
    // Teacher workload analysis
    const teacherLoads = new Map<string, number>();
    slots.forEach((slot) => {
      const teacherId = (slot as unknown as { teacherId: string }).teacherId;
      const current = teacherLoads.get(teacherId) || 0;
      teacherLoads.set(teacherId, current + 1);
    });

    const loads = Array.from(teacherLoads.values());
    const avgPeriodsPerTeacher = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
    const overloadedTeachers = loads.filter(load => load > 30).length;
    const underloadedTeachers = loads.filter(load => load < 10).length;

    // Room utilization
    const roomUsage = new Map<string, number>();
    slots.forEach((slot) => {
      const roomId = (slot as unknown as { roomId?: string }).roomId;
      if (roomId) {
        const current = roomUsage.get(roomId) || 0;
        roomUsage.set(roomId, current + 1);
      }
    });

    const usages = Array.from(roomUsage.values());
    const avgUtilization = usages.length > 0 ? usages.reduce((a, b) => a + b, 0) / usages.length : 0;
    const underutilizedRooms = usages.filter(usage => usage < 20).length;

    return {
      totalSlots: slots.length,
      filledSlots: slots.length,
      conflictCount: solution.violations?.length || 0,
      qualityScore: solution.qualityScore || 0,
      teacherWorkload: {
        avgPeriodsPerTeacher,
        overloadedTeachers,
        underloadedTeachers
      },
      roomUtilization: {
        avgUtilization,
        underutilizedRooms
      },
      subjectDistribution: {
        balanceScore: 75, // Placeholder
        unevenClasses: 0
      }
    };
  }

  private async logConflicts(draftId: string, violations: ConstraintViolation[]): Promise<void> {
    if (violations.length === 0) return;

    // Get school ID from draft
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId },
      select: { schoolId: true }
    });

    if (!draft) return;

    const conflictData = violations.map(violation => ({
      schoolId: draft.schoolId,
      timetableId: draftId,
      title: violation.description.substring(0, 100), // Use first 100 chars as title
      conflictType: violation.constraintId,
      severity: violation.severity,
      description: violation.description,
      affectedSlots: violation.affectedSlots,
      suggestedFixes: violation.suggestedFixes
    }));

    await db.timetableConflictLog.createMany({
      data: conflictData
    });
  }

  private async recheckSlotConflicts(draftId: string, slotId: string): Promise<void> {
    // Implementation would recheck conflicts for specific slot
    // This is a simplified version
    const conflicts = await this.detectAllConflicts(draftId);
    
    // Update slot conflict status
    const hasConflict = conflicts.some(c => c.affectedSlots.includes(slotId));
    
    await db.timetableSlot.update({
      where: { id: slotId },
      data: {
        hasConflict,
        conflictType: hasConflict ? 'DETECTED' : null
      }
    });
  }

  private async syncToLiveTimetable(draftId: string): Promise<void> {
    const draft = await db.timetableDraft.findUnique({
      where: { id: draftId },
      include: { 
        slots: {
          include: { room: true }
        } 
      }
    });
    
    if (!draft) return;

    // Get all class IDs involved to clean up old entries
    const classIds = [...new Set(draft.slots.map((s) => (s as unknown as { classId: string }).classId))];

    if (classIds.length === 0) return;

    await db.$transaction(async (tx) => {
      // 1. Delete existing entries for these classes
      await tx.timetableEntry.deleteMany({
        where: {
          classId: { in: classIds }
        }
      });

      // 2. Create new entries
      if (draft.slots.length > 0) {
        await tx.timetableEntry.createMany({
          data: draft.slots.map((slot) => {
            const s = slot as unknown as {
              classId: string;
              subjectId: string;
              teacherId: string;
              dayOfWeek: number;
              period: number;
              room?: { name: string } | null;
            };
            return {
              schoolId: draft.schoolId,
              classId: s.classId,
              subjectId: s.subjectId,
              staffId: s.teacherId,
              dayOfWeek: s.dayOfWeek,
              period: s.period,
              room: s.room?.name || null,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          })
        });
      }
    });
  }

  private async notifyTeachers(schoolId: string, timetableId: string): Promise<void> {
    try {
      // Get all active teachers in the school
      const teachers = await db.staff.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          role: 'TEACHER'
        },
        include: {
          user: true
        }
      });

      if (teachers.length === 0) {
        console.log('No teachers found to notify');
        return;
      }

      // Get timetable details
      const timetable = await db.timetableDraft.findUnique({
        where: { id: timetableId },
        include: {
          term: {
            include: {
              academicYear: true
            }
          }
        }
      });

      if (!timetable) {
        console.error('Timetable not found');
        return;
      }

      // Get teacher-specific timetable slots
      const teacherSlots = await db.timetableSlot.findMany({
        where: {
          timetableId
        },
        include: {
          subject: true,
          class: true
        }
      });

      // Group slots by teacher
      const slotsByTeacher = new Map<string, Array<{
        teacherId: string;
        subjectId: string;
        classId: string;
        subject?: { name: string };
        class?: { name: string };
      }>>();
      teacherSlots.forEach((slot) => {
        const teacherId = (slot as unknown as { teacherId: string }).teacherId;
        if (!slotsByTeacher.has(teacherId)) {
          slotsByTeacher.set(teacherId, []);
        }
        slotsByTeacher.get(teacherId)!.push(slot as unknown as {
          teacherId: string;
          subjectId: string;
          classId: string;
          subject?: { name: string };
          class?: { name: string };
        });
      });

      // Create notifications for each teacher with slots
      for (const teacher of teachers) {
        const slots = slotsByTeacher.get(teacher.id) || [];
        
        if (slots.length === 0) continue;

        const periodCount = slots.length;
        const uniqueSubjects = new Set(slots.map((s) => s.subjectId)).size;
        const uniqueClasses = new Set(slots.map((s) => s.classId)).size;

        const message = `Dear ${teacher.firstName} ${teacher.lastName},

The new timetable for ${timetable.term.name} has been published.

Your Schedule:
- Total Periods: ${periodCount}
- Subjects: ${uniqueSubjects}
- Classes: ${uniqueClasses}

Please review your personal timetable in the staff portal.

Published on ${new Date().toLocaleDateString()}

School`;

        // Use teacher's preferred channel (SMS if they have phone, EMAIL if they have email)
        const channel = teacher.email ? 'EMAIL' : 'SMS';
        const contact = teacher.email || teacher.phone || '';

        if (contact) {
          try {
            await db.message.create({
              data: {
                schoolId,
                studentId: '', // Not applicable for teacher notifications
                guardianId: '', // Not applicable for teacher notifications
                templateType: 'TIMETABLE_PUBLISHED_TEACHER',
                channel,
                content: message,
                status: 'QUEUED',
                createdAt: new Date()
              }
            });

            console.log(`Queued notification for teacher: ${teacher.firstName} ${teacher.lastName}`);
          } catch (error) {
            console.error(`Failed to queue notification for teacher ${teacher.id}:`, error);
          }
        }
      }

      console.log(`Teacher notification process completed`);
    } catch (error) {
      console.error('Error notifying teachers:', error);
    }
  }

  private async notifyStudents(schoolId: string, timetableId: string): Promise<void> {
    try {
      // Get all active students in the school
      const students = await db.student.findMany({
        where: {
          schoolId,
          status: 'ACTIVE'
        },
        include: {
          class: true,
          studentGuardians: {
            include: {
              guardian: true
            },
            where: {
              receivesAcademicMessages: true
            }
          }
        }
      });

      if (students.length === 0) {
        console.log('No students found to notify');
        return;
      }

      // Get timetable details
      const timetable = await db.timetableDraft.findUnique({
        where: { id: timetableId },
        include: {
          term: {
            include: {
              academicYear: true
            }
          }
        }
      });

      if (!timetable) {
        console.error('Timetable not found');
        return;
      }

      // Get class-specific timetable slots
      const classSlots = await db.timetableSlot.findMany({
        where: {
          timetableId
        },
        include: {
          subject: true,
          teacher: true
        }
      });

      // Group slots by class
      const slotsByClass = new Map<string, typeof classSlots>();
      classSlots.forEach((slot) => {
        const classId = (slot as unknown as { classId: string }).classId;
        if (!slotsByClass.has(classId)) {
          slotsByClass.set(classId, []);
        }
        slotsByClass.get(classId)!.push(slot);
      });

      // Create notifications for each student's guardians
      for (const student of students) {
        const slots = slotsByClass.get(student.classId) || [];
        
        if (slots.length === 0) continue;

        // Notify each guardian
        for (const sg of student.studentGuardians) {
          const guardian = sg.guardian;
          
          const message = `Dear ${guardian.firstName} ${guardian.lastName},

The new timetable for ${timetable.term.name} has been published for ${student.firstName} ${student.lastName} (${student.class.name}).

Total Periods: ${slots.length}

You can view the class timetable in the parent portal.

Published on ${new Date().toLocaleDateString()}

School`;

          // Use guardian's preferred channel
          const channel = guardian.preferredChannel;
          const contact = channel === 'EMAIL' ? guardian.email : guardian.phone;

          if (contact) {
            try {
              await db.message.create({
                data: {
                  schoolId,
                  studentId: student.id,
                  guardianId: guardian.id,
                  templateType: 'TIMETABLE_PUBLISHED_STUDENT',
                  channel,
                  content: message,
                  status: 'QUEUED',
                  createdAt: new Date()
                }
              });
            } catch (error) {
              console.error(`Failed to queue notification for guardian ${guardian.id}:`, error);
            }
          }
        }
      }

      console.log(`Student/guardian notification process completed`);
    } catch (error) {
      console.error('Error notifying students:', error);
    }
  }
}

export const timetableApprovalWorkflow = new TimetableApprovalWorkflowService();