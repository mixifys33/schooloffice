/**
 * TIMETABLE FAILURE MODE HANDLER
 * 
 * Handles emergency scenarios that require immediate timetable intervention:
 * - Teacher resignation mid-term
 * - Teacher medical leave
 * - Class suspension (partial or full)
 * - Subject removal/addition
 * - Room unavailability
 * - Emergency schedule changes
 * 
 * Architecture:
 * - Detect failure mode
 * - Calculate impact
 * - Propose solutions
 * - Execute changes
 * - Notify affected parties
 */

import { db } from '@/lib/db';
import { timetableConstraintEngine } from './timetable-constraint-engine.service';
import { timetableApprovalWorkflow } from './timetable-approval-workflow.service';

interface FailureContext {
  schoolId: string;
  termId: string;
  timetableId: string;
  failureType: FailureType;
  metadata: any;
  requestedBy: string; // DoS user ID
}

enum FailureType {
  TEACHER_RESIGNATION = 'TEACHER_RESIGNATION',
  TEACHER_LEAVE = 'TEACHER_LEAVE',
  CLASS_SUSPENSION = 'CLASS_SUSPENSION',
  SUBJECT_REMOVAL = 'SUBJECT_REMOVAL',
  ROOM_UNAVAILABLE = 'ROOM_UNAVAILABLE',
  EMERGENCY_CHANGE = 'EMERGENCY_CHANGE'
}

interface ImpactAnalysis {
  affectedSlots: any[];
  affectedClasses: string[];
  affectedTeachers: string[];
  affectedStudents: number;
  criticalPeriods: number; // Periods with no teacher assigned
  proposedSolutions: string[];
}

export class TimetableFailureModeHandler {
  
  /**
   * SCENARIO 1: Teacher Resignation Mid-Term
   * Remove teacher from all slots and propose reassignment options
   */
  async handleTeacherResignation(context: FailureContext): Promise<ImpactAnalysis> {
    console.log(`Handling teacher resignation for teacher: ${context.metadata.teacherId}`);
    
    const { teacherId, resignationDate, lastWorkingDay } = context.metadata;
    
    // Analyze impact
    const impact = await this.analyzeTeacherRemovalImpact(
      context.timetableId,
      teacherId
    );
    
    // Find replacement teachers for each subject
    const replacements = await this.findReplacementTeachers(
      context.schoolId,
      teacherId,
      impact.affectedSlots
    );
    
    // Create new timetable version with changes
    const newVersion = await timetableApprovalWorkflow.createNewVersion(
      context.timetableId,
      context.requestedBy,
      `Teacher resignation - ${impact.affectedSlots.length} slots affected`
    );
    
    // Reassign slots to replacement teachers
    for (const slot of impact.affectedSlots) {
      const replacement = replacements.get(slot.subjectId);
      
      if (replacement) {
        await db.timetableSlot.update({
          where: { id: slot.id },
          data: {
            teacherId: replacement.id,
            notes: `Reassigned from ${slot.teacher.firstName} ${slot.teacher.lastName} (resigned)`
          }
        });
      } else {
        // Mark as unassigned
        await db.timetableSlot.update({
          where: { id: slot.id },
          data: {
            notes: `URGENT: No replacement found for ${slot.subject.name}`,
            hasConflict: true,
            conflictType: 'TEACHER_UNAVAILABLE'
          }
        });
      }
    }
    
    // Log failure mode handling
    await this.logFailureHandling({
      failureType: FailureType.TEACHER_RESIGNATION,
      timetableId: context.timetableId,
      oldVersion: context.timetableId,
      newVersion: newVersion.id,
      impact,
      handledBy: context.requestedBy,
      handledAt: new Date()
    });
    
    // Notify affected parties
    await this.notifyFailureHandling(
      context,
      impact,
      'Teacher resignation - timetable updated'
    );
    
    return {
      ...impact,
      proposedSolutions: [
        `${replacements.size} replacement teachers assigned`,
        `${impact.affectedSlots.length - replacements.size} slots require manual assignment`,
        'Review and approve new timetable version'
      ]
    };
  }

  /**
   * SCENARIO 2: Teacher Medical Leave (Temporary)
   * Temporarily reassign teacher slots for specified period
   */
  async handleTeacherLeave(context: FailureContext): Promise<ImpactAnalysis> {
    console.log(`Handling teacher leave for teacher: ${context.metadata.teacherId}`);
    
    const { teacherId, leaveStart, leaveEnd, isEmergency } = context.metadata;
    
    // Analyze impact
    const impact = await this.analyzeTeacherRemovalImpact(
      context.timetableId,
      teacherId
    );
    
    // Find temporary replacements
    const replacements = await this.findReplacementTeachers(
      context.schoolId,
      teacherId,
      impact.affectedSlots,
      { temporary: true, startDate: leaveStart, endDate: leaveEnd }
    );
    
    // Create temporary reassignment records (not a new version)
    for (const slot of impact.affectedSlots) {
      const replacement = replacements.get(slot.subjectId);
      
      if (replacement) {
        // Create temporary assignment record
        await db.timetableSlot.update({
          where: { id: slot.id },
          data: {
            notes: `Temporary: ${replacement.firstName} ${replacement.lastName} (covering leave ${leaveStart.toLocaleDateString()} - ${leaveEnd.toLocaleDateString()})`
          }
        });
        
        // You might want to create a TemporaryAssignment model to track this
      }
    }
    
    await this.logFailureHandling({
      failureType: FailureType.TEACHER_LEAVE,
      timetableId: context.timetableId,
      impact,
      handledBy: context.requestedBy,
      metadata: { leaveStart, leaveEnd, isEmergency }
    });
    
    return {
      ...impact,
      proposedSolutions: [
        `Temporary assignments for ${leaveStart.toLocaleDateString()} - ${leaveEnd.toLocaleDateString()}`,
        `${replacements.size} substitute teachers assigned`,
        'Original teacher returns after leave period'
      ]
    };
  }

  /**
   * SCENARIO 3: Class Suspension
   * Remove all slots for suspended class(es)
   */
  async handleClassSuspension(context: FailureContext): Promise<ImpactAnalysis> {
    console.log(`Handling class suspension for classes: ${context.metadata.classIds}`);
    
    const { classIds, suspensionStart, suspensionEnd, reason } = context.metadata;
    
    // Analyze impact
    const impact = await this.analyzeClassRemovalImpact(
      context.timetableId,
      classIds
    );
    
    // Create new version without suspended class slots
    const newVersion = await timetableApprovalWorkflow.createNewVersion(
      context.timetableId,
      context.requestedBy,
      `Class suspension - ${classIds.length} class(es) suspended`
    );
    
    // Delete slots for suspended classes
    await db.timetableSlot.deleteMany({
      where: {
        timetableId: newVersion.id,
        classId: { in: classIds }
      }
    });
    
    await this.logFailureHandling({
      failureType: FailureType.CLASS_SUSPENSION,
      timetableId: newVersion.id,
      oldVersion: context.timetableId,
      newVersion: newVersion.id,
      impact,
      handledBy: context.requestedBy,
      metadata: { suspensionStart, suspensionEnd, reason }
    });
    
    // Notify teachers and parents
    await this.notifyFailureHandling(
      context,
      impact,
      `Class suspension - ${reason}`
    );
    
    return {
      ...impact,
      proposedSolutions: [
        `${impact.affectedSlots.length} slots removed`,
        `${impact.affectedTeachers.length} teachers freed up`,
        'Consider redistributing teacher load'
      ]
    };
  }

  /**
   * SCENARIO 4: Subject Removal/Addition
   * Handle curriculum changes mid-term
   */
  async handleSubjectChange(context: FailureContext): Promise<ImpactAnalysis> {
    console.log(`Handling subject change: ${context.metadata.action}`);
    
    const { action, subjectId, classIds } = context.metadata; // action: 'ADD' | 'REMOVE'
    
    if (action === 'REMOVE') {
      return await this.handleSubjectRemoval(context, subjectId, classIds);
    } else {
      return await this.handleSubjectAddition(context, subjectId, classIds);
    }
  }

  /**
   * SCENARIO 5: Room Unavailability
   * Reassign rooms for affected slots
   */
  async handleRoomUnavailability(context: FailureContext): Promise<ImpactAnalysis> {
    console.log(`Handling room unavailability for room: ${context.metadata.roomId}`);
    
    const { roomId, unavailableStart, unavailableEnd, reason } = context.metadata;
    
    // Find all slots using this room
    const affectedSlots = await db.timetableSlot.findMany({
      where: {
        timetableId: context.timetableId,
        roomId
      },
      include: {
        subject: true,
        class: true,
        teacher: true
      }
    });
    
    // Find alternative rooms
    const alternatives = await this.findAlternativeRooms(
      context.schoolId,
      roomId,
      affectedSlots
    );
    
    // Reassign rooms
    for (const slot of affectedSlots) {
      const alternativeRoom = alternatives.get(slot.id);
      
      if (alternativeRoom) {
        await db.timetableSlot.update({
          where: { id: slot.id },
          data: {
            roomId: alternativeRoom.id,
            roomName: alternativeRoom.name,
            notes: `Room change: ${reason}`
          }
        });
      }
    }
    
    const impact: ImpactAnalysis = {
      affectedSlots,
      affectedClasses: [...new Set(affectedSlots.map((s: any) => s.classId))] as string[],
      affectedTeachers: [...new Set(affectedSlots.map((s: any) => s.teacherId))] as string[],
      affectedStudents: 0, // Would calculate from classes
      criticalPeriods: affectedSlots.length - alternatives.size,
      proposedSolutions: [
        `${alternatives.size} rooms reassigned`,
        `${affectedSlots.length - alternatives.size} slots need manual room assignment`
      ]
    };
    
    await this.logFailureHandling({
      failureType: FailureType.ROOM_UNAVAILABLE,
      timetableId: context.timetableId,
      impact,
      handledBy: context.requestedBy,
      metadata: { unavailableStart, unavailableEnd, reason }
    });
    
    return impact;
  }

  /**
   * SCENARIO 6: Emergency Regeneration
   * Force regenerate timetable with teacher overrides
   */
  async handleEmergencyRegeneration(context: FailureContext): Promise<any> {
    console.log(`Handling emergency timetable regeneration`);
    
    const { reason, overrides } = context.metadata;
    
    // Create new version
    const newVersion = await timetableApprovalWorkflow.createNewVersion(
      context.timetableId,
      context.requestedBy,
      `Emergency regeneration - ${reason}`
    );
    
    // Delete all existing slots
    await db.timetableSlot.deleteMany({
      where: { timetableId: newVersion.id }
    });
    
    // Regenerate with overrides
    const solution = await timetableConstraintEngine.generateTimetable(
      context.schoolId,
      context.termId,
      { ...overrides, emergency: true }
    );
    
    // Save new slots
    const slotData = solution.slots.map(slot => ({
      timetableId: newVersion.id,
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
      roomId: slot.roomId,
      isDoubleSlot: slot.isDoubleSlot || false,
      notes: 'Emergency regeneration'
    }));
    
    await db.timetableSlot.createMany({ data: slotData });
    
    // Update draft metadata
    await db.timetableDraft.update({
      where: { id: newVersion.id },
      data: {
        qualityScore: solution.qualityScore,
        conflictCount: solution.violations.length,
        hardConstraintViolations: solution.violations.filter(v => v.severity === 'CRITICAL').length
      }
    });
    
    await this.logFailureHandling({
      failureType: FailureType.EMERGENCY_CHANGE,
      timetableId: newVersion.id,
      oldVersion: context.timetableId,
      newVersion: newVersion.id,
      handledBy: context.requestedBy,
      metadata: { reason, qualityScore: solution.qualityScore }
    });
    
    return {
      newVersionId: newVersion.id,
      qualityScore: solution.qualityScore,
      conflicts: solution.violations.length,
      message: 'Emergency regeneration completed - review and approve'
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async analyzeTeacherRemovalImpact(
    timetableId: string,
    teacherId: string
  ): Promise<ImpactAnalysis> {
    const affectedSlots = await db.timetableSlot.findMany({
      where: {
        timetableId,
        teacherId
      },
      include: {
        subject: true,
        class: true,
        teacher: true
      }
    });
    
    const affectedClasses = [...new Set(affectedSlots.map((s: any) => s.classId))] as string[];
    const affectedStudents = await db.student.count({
      where: {
        classId: { in: affectedClasses },
        status: 'ACTIVE'
      }
    });
    
    return {
      affectedSlots,
      affectedClasses,
      affectedTeachers: [teacherId],
      affectedStudents,
      criticalPeriods: affectedSlots.length,
      proposedSolutions: []
    };
  }

  private async analyzeClassRemovalImpact(
    timetableId: string,
    classIds: string[]
  ): Promise<ImpactAnalysis> {
    const affectedSlots = await db.timetableSlot.findMany({
      where: {
        timetableId,
        classId: { in: classIds }
      },
      include: {
        subject: true,
        class: true,
        teacher: true
      }
    });
    
    const affectedTeachers = [...new Set(affectedSlots.map((s: any) => s.teacherId))] as string[];
    const affectedStudents = await db.student.count({
      where: {
        classId: { in: classIds },
        status: 'ACTIVE'
      }
    });
    
    return {
      affectedSlots,
      affectedClasses: classIds,
      affectedTeachers,
      affectedStudents,
      criticalPeriods: affectedSlots.length,
      proposedSolutions: []
    };
  }

  private async findReplacementTeachers(
    schoolId: string,
    resignedTeacherId: string,
    affectedSlots: any[],
    options?: { temporary?: boolean; startDate?: Date; endDate?: Date }
  ): Promise<Map<string, any>> {
    const replacements = new Map<string, any>();
    
    // Group slots by subject
    const slotsBySubject = new Map<string, any[]>();
    affectedSlots.forEach(slot => {
      if (!slotsBySubject.has(slot.subjectId)) {
        slotsBySubject.set(slot.subjectId, []);
      }
      slotsBySubject.get(slot.subjectId)!.push(slot);
    });
    
    // Find replacement teacher for each subject
    for (const [subjectId, slots] of slotsBySubject) {
      // Get qualified teachers for this subject
      const qualifiedTeachers = await db.staff.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          role: 'TEACHER',
          id: { not: resignedTeacherId },
          staffSubjects: {
            some: {
              subjectId
            }
          }
        }
      });
      
      if (qualifiedTeachers.length > 0) {
        // Pick teacher with least current workload
        const teacherWorkloads = await Promise.all(
          qualifiedTeachers.map(async (teacher: any) => ({
            teacher,
            workload: await this.calculateTeacherWorkload(teacher.id)
          }))
        );
        
        teacherWorkloads.sort((a, b) => a.workload - b.workload);
        replacements.set(subjectId, teacherWorkloads[0].teacher);
      }
    }
    
    return replacements;
  }

  private async findAlternativeRooms(
    schoolId: string,
    unavailableRoomId: string,
    affectedSlots: any[]
  ): Promise<Map<string, any>> {
    const alternatives = new Map<string, any>();
    
    // Get all available rooms
    const availableRooms = await db.room.findMany({
      where: {
        schoolId,
        isActive: true,
        id: { not: unavailableRoomId }
      }
    });
    
    for (const slot of affectedSlots) {
      // Find suitable room based on subject requirements
      const suitableRoom = availableRooms.find((room: any) => {
        // Check if room meets subject requirements
        if (slot.subject.requiresLab && !room.hasLab) {
          return false;
        }
        // Add more criteria as needed
        return true;
      });
      
      if (suitableRoom) {
        alternatives.set(slot.id, suitableRoom);
      }
    }
    
    return alternatives;
  }

  private async calculateTeacherWorkload(teacherId: string): Promise<number> {
    // Calculate current periods assigned to this teacher
    const slots = await db.timetableSlot.count({
      where: { teacherId }
    });
    return slots;
  }

  private async handleSubjectRemoval(
    context: FailureContext,
    subjectId: string,
    classIds: string[]
  ): Promise<ImpactAnalysis> {
    const affectedSlots = await db.timetableSlot.findMany({
      where: {
        timetableId: context.timetableId,
        subjectId,
        classId: { in: classIds }
      },
      include: {
        subject: true,
        class: true,
        teacher: true
      }
    });
    
    // Create new version without these slots
    const newVersion = await timetableApprovalWorkflow.createNewVersion(
      context.timetableId,
      context.requestedBy,
      `Subject removed from ${classIds.length} class(es)`
    );
    
    await db.timetableSlot.deleteMany({
      where: {
        timetableId: newVersion.id,
        subjectId,
        classId: { in: classIds }
      }
    });
    
    return {
      affectedSlots,
      affectedClasses: classIds,
      affectedTeachers: [...new Set(affectedSlots.map((s: any) => s.teacherId))] as string[],
      affectedStudents: 0,
      criticalPeriods: 0,
      proposedSolutions: [`${affectedSlots.length} slots removed`]
    };
  }

  private async handleSubjectAddition(
    context: FailureContext,
    subjectId: string,
    classIds: string[]
  ): Promise<ImpactAnalysis> {
    // Would need to regenerate timetable with new subject
    // This is complex and would require calling generation engine
    throw new Error('Subject addition requires full regeneration');
  }

  private async logFailureHandling(data: any): Promise<void> {
    console.log('Failure mode handled:', data);
    
    // You might want to create a FailureModeLog model
    // await db.failureModeLog.create({ data });
  }

  private async notifyFailureHandling(
    context: FailureContext,
    impact: ImpactAnalysis,
    message: string
  ): Promise<void> {
    console.log(`Notifying about failure handling: ${message}`);
    
    // Notify affected teachers
    for (const teacherId of impact.affectedTeachers) {
      // Create notification
    }
    
    // Notify DoS
    // Notify parents if needed
  }
}

export const timetableFailureModeHandler = new TimetableFailureModeHandler();
