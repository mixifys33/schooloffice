// ============================================ // TIMETABLE SERVICE // Main service for timetable generation and management // ============================================
   
import { db } from '@/lib/db';
import { TimetableConstraintEngine } from './timetable-constraint-engine.service';
import {
  TimetableDraft,
  TimetableSlot,
  TimetableStatus,
  GenerationResult,
  TimetableConflict,
  TimetableAnalytics,
  TimetableGenerationSettings,
  GenerateTimetableRequest,
  GenerateTimetableResponse,
  ConflictSeverity,
  SubjectPeriodRequirement,
  SchoolTimeStructure
} from '@/types/timetable';

export class TimetableService {
  
  // ============================================
  // TIMETABLE GENERATION
  // ============================================

  static async generateTimetable(request: GenerateTimetableRequest): Promise<GenerateTimetableResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Load configuration data
      const config = await this.loadGenerationConfiguration(request.schoolId);
      if (!config.success) {
        return {
          success: false,
          message: config.error || 'Failed to load configuration',
          generationTime: Date.now() - startTime,
          conflicts: []
        };
      }

      // 2. Initialize constraint engine
      const engine = new TimetableConstraintEngine();

      // 3. Generate timetable using constraint solver
      const generationResult = await this.runGenerationAlgorithm(
        engine,
        config,
        request.settings
      );

      if (!generationResult.success) {
        return {
          success: false,
          message: generationResult.errorMessage || 'Generation failed',
          generationTime: Date.now() - startTime,
          conflicts: generationResult.conflicts
        };
      }

      // 4. Create draft timetable record
      const draft = await this.createTimetableDraft({
        schoolId: request.schoolId,
        termId: request.termId,
        slots: generationResult.timetable!,
        qualityScore: generationResult.qualityScore!,
        conflicts: generationResult.conflicts,
        generationTime: generationResult.generationTime,
        attempts: generationResult.attempts
      });

      return {
        success: true,
        timetableId: draft.id,
        qualityScore: generationResult.qualityScore,
        conflicts: generationResult.conflicts,
        generationTime: Date.now() - startTime,
        message: `Timetable generated successfully with quality score ${generationResult.qualityScore?.toFixed(1)}%`
      };

    } catch (error) {
      console.error('Timetable generation error:', error);
      return {
        success: false,
        message: 'Internal error during generation',
        generationTime: Date.now() - startTime,
        conflicts: []
      };
    }
  }

  private static async loadGenerationConfiguration(schoolId: string): Promise<{
    success: boolean;
    error?: string;
    settings: TimetableGenerationSettings;
    timeStructure: SchoolTimeStructure;
    subjectRequirements: SubjectPeriodRequirement[];
    teacherConstraints: Record<string, unknown>[];
    roomConstraints: Record<string, unknown>[];
    classes: Record<string, unknown>[];
    subjects: Record<string, unknown>[];
    teachers: Record<string, unknown>[];
  } | { success: false; error: string }> {
    try {
      // Load all required configuration data
      const [
        settings,
        timeStructure,
        subjectRequirements,
        teacherConstraints,
        roomConstraints,
        classes,
        subjects,
        teachers
      ] = await Promise.all([
        db.timetableGenerationSettings.findUnique({ where: { schoolId } }),
        db.schoolTimeStructure.findFirst({ where: { schoolId, isActive: true } }),
        db.subjectPeriodRequirement.findMany({ where: { schoolId } }),
        db.teacherConstraint.findMany({ where: { schoolId } }),
        db.roomConstraint.findMany({ where: { schoolId } }),
        db.class.findMany({ where: { schoolId } }),
        db.subject.findMany({ where: { schoolId, isActive: true } }),
        db.staff.findMany({ where: { schoolId, status: 'ACTIVE' } })
      ]);

      if (!timeStructure) {
        return { success: false, error: 'School time structure not configured' };
      }

      if (subjectRequirements.length === 0) {
        return { success: false, error: 'No subject period requirements configured' };
      }

      // Use default settings if not configured
      const defaultSettings: TimetableGenerationSettings = {
        id: '',
        schoolId,
        prioritizeTeacherBalance: true,
        prioritizeSubjectSpread: true,
        prioritizeRoomOptimization: false,
        hardConstraintWeight: 100,
        teacherWorkloadWeight: 80,
        subjectSpreadWeight: 70,
        roomPreferenceWeight: 60,
        timePreferenceWeight: 50,
        maxGenerationAttempts: 1000,
        maxGenerationTimeMs: 30000,
        minAcceptableQuality: 70.0,
        targetQualityScore: 85.0,
        updatedAt: new Date(),
        updatedBy: ''
      };

      return {
        success: true,
        settings: settings || defaultSettings,
        timeStructure,
        subjectRequirements,
        teacherConstraints,
        roomConstraints,
        classes,
        subjects,
        teachers
      };

    } catch (error) {
      console.error('Error loading configuration:', error);
      return { success: false, error: 'Failed to load configuration data' };
    }
  }

  private static async runGenerationAlgorithm(
    engine: TimetableConstraintEngine,
    config: {
      settings: TimetableGenerationSettings;
      timeStructure: SchoolTimeStructure;
      subjectRequirements: SubjectPeriodRequirement[];
      teacherConstraints: Record<string, unknown>[];
      roomConstraints: Record<string, unknown>[];
      classes: Record<string, unknown>[];
      subjects: Record<string, unknown>[];
      teachers: Record<string, unknown>[];
    },
    customSettings?: Partial<TimetableGenerationSettings>
  ): Promise<GenerationResult> {
    const settings = { ...config.settings, ...customSettings };
    const startTime = Date.now();
    let bestTimetable: TimetableSlot[] = [];
    let bestQuality = 0;
    let attempts = 0;

    // Generate required slots based on subject requirements
    const requiredSlots = this.generateRequiredSlots(config.subjectRequirements, config.classes, config.subjects, config.teachers);
    
    while (attempts < settings.maxGenerationAttempts && 
           Date.now() - startTime < settings.maxGenerationTimeMs) {
      
      attempts++;
      
      // Try to place all required slots
      const timetable = await this.attemptSlotPlacement(requiredSlots, engine, config);
      
      if (timetable.length === 0) continue; // Failed to place any slots
      
      // Calculate quality
      const quality = engine.calculateTimetableQuality(timetable);
      
      if (quality > bestQuality) {
        bestTimetable = [...timetable];
        bestQuality = quality;
        
        // If we hit target quality, we can stop
        if (quality >= settings.targetQualityScore) {
          break;
        }
      }
      
      // If we have acceptable quality, we can use it
      if (quality >= settings.minAcceptableQuality && attempts > 100) {
        break;
      }
    }

    const violations = engine.validateCompleteTimetable(bestTimetable);
    
    // Convert ConstraintViolations to TimetableConflicts
    const conflicts: TimetableConflict[] = violations.map((violation) => ({
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timetableId: '', // Will be set when creating the draft
      conflictType: 'CONSTRAINT_VIOLATION' as 'TEACHER_CLASH' | 'ROOM_CLASH' | 'CLASS_CLASH' | 'SUBJECT_PERIODS' | 'TEACHER_OVERLOAD' | 'CONSTRAINT_VIOLATION',
      severity: violation.severity,
      title: violation.constraintId,
      description: violation.description,
      affectedSlots: violation.affectedSlots,
      suggestedFix: violation.suggestedFixes.length > 0 ? {
        type: 'MOVE_SLOT' as const,
        description: violation.suggestedFixes[0],
        actions: []
      } : undefined,
      isResolved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    return {
      success: bestTimetable.length > 0 && bestQuality >= settings.minAcceptableQuality,
      timetable: bestTimetable,
      qualityScore: bestQuality,
      conflicts,
      generationTime: Date.now() - startTime,
      attempts,
      errorMessage: bestTimetable.length === 0 ? 'Could not generate valid timetable' : undefined
    };
  }

  private static generateRequiredSlots(
    subjectRequirements: SubjectPeriodRequirement[],
    classes: Record<string, unknown>[],
    subjects: Record<string, unknown>[],
    teachers: Record<string, unknown>[]
  ): Partial<TimetableSlot>[] {
    const slots: Partial<TimetableSlot>[] = [];
    
    for (const requirement of subjectRequirements) {
      const subject = subjects.find(s => s.id === requirement.subjectId);
      const classInfo = classes.find(c => c.id === requirement.classId);
      
      if (!subject || !classInfo) continue;
      
      // Find qualified teachers for this subject
      const qualifiedTeachers = teachers.filter(() => 
        // This would check teacher-subject assignments
        // For now, assume all teachers can teach all subjects
        true
      );
      
      if (qualifiedTeachers.length === 0) continue;
      
      // Create required number of slots for this subject-class combination
      for (let i = 0; i < requirement.periodsPerWeek; i++) {
        slots.push({
          id: `slot_${requirement.subjectId}_${requirement.classId}_${i}`,
          classId: requirement.classId,
          subjectId: requirement.subjectId,
          teacherId: String(qualifiedTeachers[0].id), // Will be optimized during placement
          dayOfWeek: 0, // Will be assigned during placement
          period: 0, // Will be assigned during placement
          duration: 40,
          isDoubleSlot: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    return slots;
  }

  private static async attemptSlotPlacement(
    requiredSlots: Partial<TimetableSlot>[],
    engine: TimetableConstraintEngine,
    config: {
      timeStructure: SchoolTimeStructure;
      [key: string]: unknown;
    }
  ): Promise<TimetableSlot[]> {
    const timetable: TimetableSlot[] = [];
    const timeStructure = config.timeStructure;
    
    // Shuffle slots for randomness
    const shuffledSlots = [...requiredSlots].sort(() => Math.random() - 0.5);
    
    for (const partialSlot of shuffledSlots) {
      let placed = false;
      
      // Try to place this slot in available time slots
      for (let day = 1; day <= 5; day++) { // Monday to Friday
        for (let period = 1; period <= timeStructure.periodsPerDay; period++) {
          const candidateSlot: TimetableSlot = {
            ...partialSlot,
            dayOfWeek: day,
            period,
            timetableId: '' // Will be set later
          } as TimetableSlot;
          
          // Check if this placement violates hard constraints
          const violations = engine.validateHardConstraints(candidateSlot, timetable);
          
          if (violations.length === 0) {
            // Valid placement found
            timetable.push(candidateSlot);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      
      // If we couldn't place a required slot, this attempt failed
      if (!placed) {
        return []; // Return empty timetable to indicate failure
      }
    }
    
    return timetable;
  }

  private static async createTimetableDraft(data: {
    schoolId: string;
    termId: string;
    slots: TimetableSlot[];
    qualityScore: number;
    conflicts: TimetableConflict[];
    generationTime: number;
    attempts: number;
  }): Promise<TimetableDraft> {
    
    // Get next version number
    const lastVersion = await db.timetableDraft.findFirst({
      where: { schoolId: data.schoolId, termId: data.termId },
      orderBy: { version: 'desc' }
    });
    
    const version = (lastVersion?.version || 0) + 1;
    
    // Create the draft
    const draft = await db.timetableDraft.create({
      data: {
        name: `Timetable v${version}`,
        schoolId: data.schoolId,
        termId: data.termId,
        version,
        status: TimetableStatus.DRAFT,
        generatedBy: 'system', // Would be actual user ID
        generatedAt: new Date(),
        generationAlgorithm: 'constraint_solver_v1',
        generationTime: data.generationTime,
        qualityScore: data.qualityScore
      }
    });
    
    // Create slots
    const slotsWithTimetableId = data.slots.map(slot => ({
      ...slot,
      timetableId: draft.id,
      schoolId: data.schoolId
    }));
    
    await db.timetableSlot.createMany({
      data: slotsWithTimetableId
    });
    
    // Create conflicts
    const conflictsWithTimetableId = data.conflicts.map(conflict => ({
      id: conflict.id,
      timetableId: draft.id,
      schoolId: data.schoolId,
      conflictType: conflict.conflictType,
      severity: conflict.severity,
      title: conflict.title,
      description: conflict.description,
      affectedSlots: conflict.affectedSlots,
      suggestedFix: conflict.suggestedFix ? JSON.parse(JSON.stringify(conflict.suggestedFix)) : undefined, // JSON type
      isResolved: conflict.isResolved,
      resolvedAt: conflict.resolvedAt,
      resolvedBy: conflict.resolvedBy,
      dismissedAt: conflict.dismissedAt,
      dismissedBy: conflict.dismissedBy,
      createdAt: conflict.createdAt,
      updatedAt: conflict.updatedAt
    }));
    
    if (conflictsWithTimetableId.length > 0) {
      await db.timetableConflict.createMany({
        data: conflictsWithTimetableId
      });
    }
    
    return {
      ...draft,
      slots: slotsWithTimetableId,
      conflicts: data.conflicts
    } as TimetableDraft;
  }

  // ============================================
  // TIMETABLE MANAGEMENT
  // ============================================

  static async getTimetableDraft(timetableId: string): Promise<TimetableDraft | null> {
    const draft = await db.timetableDraft.findUnique({
      where: { id: timetableId },
      include: {
        slots: {
          include: {
            class: true,
            subject: true,
            teacher: true
          }
        },
        conflicts: true
      }
    });
    
    return draft as TimetableDraft | null;
  }

  static async approveTimetable(timetableId: string, approvedBy: string, notes?: string): Promise<boolean> {
    try {
      await db.timetableDraft.update({
        where: { id: timetableId },
        data: {
          status: TimetableStatus.APPROVED,
          approvedBy,
          approvedAt: new Date(),
          approvalNotes: notes
        }
      });
      
      // Create version history record
      await this.createVersionHistory(timetableId, 'APPROVED', approvedBy);
      
      return true;
    } catch (error) {
      console.error('Error approving timetable:', error);
      return false;
    }
  }

  static async publishTimetable(timetableId: string, publishedBy: string): Promise<boolean> {
    try {
      // First check if timetable is approved
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId }
      });
      
      if (!draft || draft.status !== TimetableStatus.APPROVED) {
        throw new Error('Timetable must be approved before publishing');
      }
      
      // Update status to published
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
      
      // Create version history record
      await this.createVersionHistory(timetableId, 'PUBLISHED', publishedBy);
      
      // TODO: Send notifications to teachers and students
      
      return true;
    } catch (error) {
      console.error('Error publishing timetable:', error);
      return false;
    }
  }

  static async unpublishTimetable(timetableId: string, unpublishedBy: string, reason?: string): Promise<boolean> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId }
      });
      
      if (!draft) {
        throw new Error('Timetable not found');
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
      
      return true;
    } catch (error) {
      console.error('Error unpublishing timetable:', error);
      return false;
    }
  }

  // ============================================
  // ANALYTICS AND INSIGHTS
  // ============================================

  static async calculateTimetableAnalytics(timetableId: string): Promise<TimetableAnalytics | null> {
    try {
      const draft = await db.timetableDraft.findUnique({
        where: { id: timetableId },
        include: {
          slots: {
            include: {
              teacher: true,
              subject: true,
              class: true
            }
          }
        }
      });
      
      if (!draft) return null;
      
      const slots = draft.slots;
      
      // Map slots to proper type
      const mappedSlots: TimetableSlot[] = slots.map(slot => ({
        ...slot,
        roomId: slot.roomId ?? undefined,
        roomName: slot.roomName ?? undefined,
        notes: slot.notes ?? undefined
      }));
      
      // Calculate teacher workload stats
      const teacherWorkloadStats: Record<string, {
        periodsPerWeek: number;
        maxPeriodsPerDay: number;
        utilization: number;
      }> = {};
      for (const slot of mappedSlots) {
        if (!teacherWorkloadStats[slot.teacherId]) {
          teacherWorkloadStats[slot.teacherId] = {
            periodsPerWeek: 0,
            maxPeriodsPerDay: 0,
            utilization: 0
          };
        }
        teacherWorkloadStats[slot.teacherId].periodsPerWeek++;
      }
      
      // Calculate daily maximums for each teacher
      for (const teacherId of Object.keys(teacherWorkloadStats)) {
        let maxDaily = 0;
        for (let day = 1; day <= 5; day++) {
          const dailyCount = mappedSlots.filter((s) => s.teacherId === teacherId && s.dayOfWeek === day).length;
          maxDaily = Math.max(maxDaily, dailyCount);
        }
        teacherWorkloadStats[teacherId].maxPeriodsPerDay = maxDaily;
        teacherWorkloadStats[teacherId].utilization = (teacherWorkloadStats[teacherId].periodsPerWeek / 25) * 100;
      }
      
      // Calculate subject distribution
      const subjectDistribution: Record<string, {
        totalPeriods: number;
        classCount: number;
        teacherCount: number;
      }> = {};
      for (const slot of mappedSlots) {
        if (!subjectDistribution[slot.subjectId]) {
          subjectDistribution[slot.subjectId] = {
            totalPeriods: 0,
            classCount: 0,
            teacherCount: 0
          };
        }
        subjectDistribution[slot.subjectId].totalPeriods++;
      }
      
      // Calculate unique classes and teachers per subject
      const subjectClasses = new Map<string, Set<string>>();
      const subjectTeachers = new Map<string, Set<string>>();
      
      for (const slot of mappedSlots) {
        if (!subjectClasses.has(slot.subjectId)) {
          subjectClasses.set(slot.subjectId, new Set());
        }
        if (!subjectTeachers.has(slot.subjectId)) {
          subjectTeachers.set(slot.subjectId, new Set());
        }
        subjectClasses.get(slot.subjectId)!.add(slot.classId);
        subjectTeachers.get(slot.subjectId)!.add(slot.teacherId);
      }
      
      // Convert sets to counts
      for (const subjectId of Object.keys(subjectDistribution)) {
        subjectDistribution[subjectId].classCount = subjectClasses.get(subjectId)?.size || 0;
        subjectDistribution[subjectId].teacherCount = subjectTeachers.get(subjectId)?.size || 0;
      }
      
      // Calculate room utilization (simplified)
      const roomUtilization: Record<string, {
        utilizationPercent: number;
        peakHours: number[];
      }> = {};
      // This would be more complex in real implementation
      
      // Calculate quality metrics
      const qualityScore = draft.qualityScore || 0;
      const conflicts = await db.timetableConflict.findMany({
        where: { timetableId }
      });
      
      const analytics: TimetableAnalytics = {
        id: `analytics_${timetableId}`,
        schoolId: draft.schoolId,
        termId: draft.termId,
        timetableId,
        totalSlots: slots.length,
        filledSlots: slots.length,
        conflictCount: conflicts.length,
        teacherWorkloadStats,
        subjectDistribution,
        roomUtilization,
        qualityScore,
        constraintViolations: conflicts.filter((c) => c.severity === ConflictSeverity.CRITICAL).length,
        softConstraintScore: qualityScore, // Simplified
        teacherLoadBalance: this.calculateTeacherLoadBalance(teacherWorkloadStats),
        subjectSpreadScore: qualityScore, // Simplified
        morningSlotUsage: this.calculateMorningSlotUsage(mappedSlots),
        afternoonSlotUsage: this.calculateAfternoonSlotUsage(mappedSlots),
        calculatedAt: new Date()
      };
      
      // Save analytics to database
      await db.timetableAnalytics.upsert({
        where: {
          schoolId_termId_timetableId: {
            schoolId: draft.schoolId,
            termId: draft.termId,
            timetableId
          }
        },
        update: analytics,
        create: analytics
      });
      
      return analytics;
      
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return null;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private static async createVersionHistory(timetableId: string, action: string, userId: string): Promise<void> {
    const draft = await db.timetableDraft.findUnique({
      where: { id: timetableId },
      include: { slots: true }
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
        conflictCount: 0, // Would calculate actual conflicts
        qualityScore: draft.qualityScore,
        createdAt: new Date()
      }
    });
  }

  private static calculateTeacherLoadBalance(teacherStats: Record<string, {
    periodsPerWeek: number;
    maxPeriodsPerDay: number;
    utilization: number;
  }>): number {
    const workloads = Object.values(teacherStats).map((stats) => stats.periodsPerWeek);
    if (workloads.length === 0) return 0;
    
    const mean = workloads.reduce((sum, load) => sum + load, 0) / workloads.length;
    const variance = workloads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / workloads.length;
    
    return Math.sqrt(variance);
  }

  private static calculateMorningSlotUsage(slots: TimetableSlot[]): number {
    const morningSlots = slots.filter(slot => slot.period <= 4); // Assuming first 4 periods are morning
    const totalMorningCapacity = 4 * 5; // 4 periods × 5 days
    return (morningSlots.length / totalMorningCapacity) * 100;
  }

  private static calculateAfternoonSlotUsage(slots: TimetableSlot[]): number {
    const afternoonSlots = slots.filter(slot => slot.period > 4);
    const totalAfternoonCapacity = 4 * 5; // Assuming last 4 periods are afternoon
    return (afternoonSlots.length / totalAfternoonCapacity) * 100;
  }

  // Method to remove inactive teachers from timetables
  static async removeInactiveTeacherFromTimetable(teacherId: string, schoolId: string): Promise<boolean> {
    try {
      // Remove teacher from all timetable slots
      await db.timetableSlot.deleteMany({
        where: {
          teacherId,
          AND: [
            {
              timetable: {
                schoolId
              }
            }
          ]
        }
      });
       
      return true;
    } catch (error) {
      console.error('Error removing inactive teacher from timetable:', error);
      return false;
    }
  }
}

// Export singleton instance
export const timetableService = new TimetableService()