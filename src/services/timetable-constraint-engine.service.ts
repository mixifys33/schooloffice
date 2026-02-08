/**
 * TIMETABLE CONSTRAINT ENGINE
 * 
 * This is the brain of the timetable system.
 * No UI magic, no drag-and-drop toys.
 * Pure constraint satisfaction with real algorithms.
 * 
 * Architecture:
 * 1. Constraint Definition & Validation
 * 2. Genetic Algorithm for Generation
 * 3. Conflict Detection & Resolution
 * 4. Quality Scoring System
 */

import { db } from '@/lib/db';
import type {
  ConflictSeverity,
  ConstraintType,
  GenerationStatus
} from '@/types/timetable';
import type {
  TimetableSlot,
  TimetableConflictLog
} from '@prisma/client';

// ============================================
// CONSTRAINT DEFINITIONS
// ============================================

export interface ConstraintViolation {
  constraintId: string;
  severity: ConflictSeverity;
  description: string;
  affectedSlots: string[];
  suggestedFixes: string[];
}

export interface TimetableSolution {
  slots: TimetableSlot[];
  schoolId: string;
  termId: string;
  qualityScore?: number;
  violations: ConstraintViolation[];
}

export interface HardConstraint {
  id: string;
  name: string;
  validate: (solution: TimetableSolution) => ConstraintViolation[];
  weight: number;
}

export interface SoftConstraint {
  id: string;
  name: string;
  score: (solution: TimetableSolution) => number; // 0-100, higher is better
  weight: number;
}

export interface GenerationContext {
  schoolId: string;
  termId: string;
  classes: any[];
  subjects: any[];
  teachers: any[];
  rooms: any[];
  timeStructure: any;
  requirements: any[];
  teacherConstraints: any[];
  roomConstraints: any[];
}

// ============================================
// HARD CONSTRAINTS (NEVER BREAK)
// ============================================

class HardConstraints {
  static getConstraints(context: GenerationContext): HardConstraint[] {
    return [
      {
        id: 'no_teacher_clash',
        name: 'No Teacher Double Booking',
        weight: 1000,
        validate: (solution: TimetableSolution) => {
          const violations: ConstraintViolation[] = [];
          const teacherSlots = new Map<string, Map<string, TimetableSlot[]>>();

          // Group slots by teacher and time
          solution.slots.forEach(slot => {
            const timeKey = `${slot.dayOfWeek}-${slot.period}`;
            
            if (!teacherSlots.has(slot.teacherId)) {
              teacherSlots.set(slot.teacherId, new Map());
            }
            
            const teacherTimeSlots = teacherSlots.get(slot.teacherId)!;
            if (!teacherTimeSlots.has(timeKey)) {
              teacherTimeSlots.set(timeKey, []);
            }
            
            teacherTimeSlots.get(timeKey)!.push(slot);
          });

          // Check for clashes
          teacherSlots.forEach((timeSlots, teacherId) => {
            timeSlots.forEach((slots, timeKey) => {
              if (slots.length > 1) {
                violations.push({
                  constraintId: 'no_teacher_clash',
                  severity: 'CRITICAL',
                  description: `Teacher ${teacherId} has ${slots.length} classes at ${timeKey}`,
                  affectedSlots: slots.map(s => s.id),
                  suggestedFixes: [
                    'Move one class to different time',
                    'Assign different teacher',
                    'Combine classes if appropriate'
                  ]
                });
              }
            });
          });

          return violations;
        }
      },

      {
        id: 'no_class_clash',
        name: 'No Class Double Booking',
        weight: 1000,
        validate: (solution: TimetableSolution) => {
          const violations: ConstraintViolation[] = [];
          const classSlots = new Map<string, Map<string, TimetableSlot[]>>();

          solution.slots.forEach(slot => {
            const timeKey = `${slot.dayOfWeek}-${slot.period}`;
            
            if (!classSlots.has(slot.classId)) {
              classSlots.set(slot.classId, new Map());
            }
            
            const classTimeSlots = classSlots.get(slot.classId)!;
            if (!classTimeSlots.has(timeKey)) {
              classTimeSlots.set(timeKey, []);
            }
            
            classTimeSlots.get(timeKey)!.push(slot);
          });

          classSlots.forEach((timeSlots, classId) => {
            timeSlots.forEach((slots, timeKey) => {
              if (slots.length > 1) {
                violations.push({
                  constraintId: 'no_class_clash',
                  severity: 'CRITICAL',
                  description: `Class ${classId} has ${slots.length} subjects at ${timeKey}`,
                  affectedSlots: slots.map(s => s.id),
                  suggestedFixes: [
                    'Move one subject to different time',
                    'Check if subjects can be combined'
                  ]
                });
              }
            });
          });

          return violations;
        }
      },

      {
        id: 'no_room_clash',
        name: 'No Room Double Booking',
        weight: 1000,
        validate: (solution: TimetableSolution) => {
          const violations: ConstraintViolation[] = [];
          const roomSlots = new Map<string, Map<string, TimetableSlot[]>>();

          solution.slots.forEach(slot => {
            if (!slot.roomId) return; // Skip if no room assigned
            
            const timeKey = `${slot.dayOfWeek}-${slot.period}`;
            
            if (!roomSlots.has(slot.roomId)) {
              roomSlots.set(slot.roomId, new Map());
            }
            
            const roomTimeSlots = roomSlots.get(slot.roomId)!;
            if (!roomTimeSlots.has(timeKey)) {
              roomTimeSlots.set(timeKey, []);
            }
            
            roomTimeSlots.get(timeKey)!.push(slot);
          });

          roomSlots.forEach((timeSlots, roomId) => {
            timeSlots.forEach((slots, timeKey) => {
              if (slots.length > 1) {
                violations.push({
                  constraintId: 'no_room_clash',
                  severity: 'CRITICAL',
                  description: `Room ${roomId} has ${slots.length} classes at ${timeKey}`,
                  affectedSlots: slots.map(s => s.id),
                  suggestedFixes: [
                    'Move one class to different room',
                    'Move one class to different time',
                    'Use alternative room if available'
                  ]
                });
              }
            });
          });

          return violations;
        }
      },

      {
        id: 'subject_period_requirements',
        name: 'Subject Period Requirements Met',
        weight: 900,
        validate: (solution: TimetableSolution) => {
          const violations: ConstraintViolation[] = [];
          // Create a local reference to context.requirements to fix closure issue
          const localRequirements = context.requirements;
          
          // Group slots by class and subject
          const classSubjectCounts = new Map<string, Map<string, number>>();
          
          solution.slots.forEach(slot => {
            if (!classSubjectCounts.has(slot.classId)) {
              classSubjectCounts.set(slot.classId, new Map());
            }
            const subjectCounts = classSubjectCounts.get(slot.classId)!;
            subjectCounts.set(slot.subjectId, (subjectCounts.get(slot.subjectId) || 0) + 1);
          });

          localRequirements.forEach((req: any) => {
            const actualCount = classSubjectCounts.get(req.classId)?.get(req.subjectId) || 0;
            if (actualCount !== req.periodsPerWeek) {
              violations.push({
                constraintId: 'subject_period_requirements',
                severity: 'CRITICAL',
                description: `Class ${req.classId} has ${actualCount} periods of Subject ${req.subjectId}, expected ${req.periodsPerWeek}`,
                affectedSlots: [],
                suggestedFixes: [
                  actualCount < req.periodsPerWeek ? 'Add more periods' : 'Remove periods'
                ]
              });
            }
          });

          return violations;
        }
      },

      {
        id: 'teacher_qualification',
        name: 'Teacher Subject Qualification',
        weight: 950,
        validate: (solution: TimetableSolution) => {
          const violations: ConstraintViolation[] = [];
          // Create a local reference to context.teachers to fix closure issue
          const localTeachers = context.teachers;
          
          solution.slots.forEach(slot => {
            const teacher = localTeachers.find((t: any) => t.id === slot.teacherId);
            if (!teacher) return;
            
            // Check if teacher has this subject assigned for this class
            const isQualified = teacher.staffSubjects.some((ss: any) => 
              ss.subjectId === slot.subjectId && ss.classId === slot.classId
            );
            
            if (!isQualified) {
               violations.push({
                 constraintId: 'teacher_qualification',
                 severity: 'CRITICAL',
                 description: `Teacher is not qualified/assigned to teach Subject ${slot.subjectId} for Class ${slot.classId}`,
                 affectedSlots: [slot.id],
                 suggestedFixes: ['Assign qualified teacher']
               });
            }
          });
          
          return violations;
        }
      }
    ];
  }
}

// ============================================
// SOFT CONSTRAINTS (QUALITY OPTIMIZATION)
// ============================================

class SoftConstraints {
  static getConstraints(): SoftConstraint[] {
    return [
      {
        id: 'teacher_workload_balance',
        name: 'Balanced Teacher Workload',
        weight: 0.3,
        score: (solution: TimetableSolution) => {
          const teacherLoads = new Map<string, number>();
          
          solution.slots.forEach(slot => {
            const current = teacherLoads.get(slot.teacherId) || 0;
            teacherLoads.set(slot.teacherId, current + 1);
          });

          const loads = Array.from(teacherLoads.values());
          if (loads.length === 0) return 0;

          const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
          const variance = loads.reduce((acc, load) => acc + Math.pow(load - mean, 2), 0) / loads.length;
          const stdDev = Math.sqrt(variance);

          // Lower standard deviation = better balance = higher score
          return Math.max(0, 100 - (stdDev * 10));
        }
      },

      {
        id: 'subject_spread',
        name: 'Even Subject Distribution',
        weight: 0.25,
        score: (solution: TimetableSolution) => {
          const classSubjectDays = new Map<string, Map<string, Set<number>>>();
          
          solution.slots.forEach(slot => {
            const classKey = slot.classId;
            const subjectKey = slot.subjectId;
            
            if (!classSubjectDays.has(classKey)) {
              classSubjectDays.set(classKey, new Map());
            }
            
            const classSubjects = classSubjectDays.get(classKey)!;
            if (!classSubjects.has(subjectKey)) {
              classSubjects.set(subjectKey, new Set());
            }
            
            classSubjects.get(subjectKey)!.add(slot.dayOfWeek);
          });

          let totalSpreadScore = 0;
          let classCount = 0;

          classSubjectDays.forEach((subjects) => {
            subjects.forEach((days) => {
              // Better spread = more days = higher score
              const spreadScore = (days.size / 5) * 100; // Assuming 5-day week
              totalSpreadScore += spreadScore;
            });
            classCount++;
          });

          return classCount > 0 ? totalSpreadScore / classCount : 0;
        }
      },

      {
        id: 'room_utilization',
        name: 'Optimal Room Usage',
        weight: 0.2,
        score: (solution: TimetableSolution) => {
          const roomUsage = new Map<string, number>();
          let totalSlots = 0;

          solution.slots.forEach(slot => {
            if (slot.roomId) {
              const current = roomUsage.get(slot.roomId) || 0;
              roomUsage.set(slot.roomId, current + 1);
            }
            totalSlots++;
          });

          // Calculate utilization variance
          const usages = Array.from(roomUsage.values());
          if (usages.length === 0) return 0;

          const mean = usages.reduce((a, b) => a + b, 0) / usages.length;
          const variance = usages.reduce((acc, usage) => acc + Math.pow(usage - mean, 2), 0) / usages.length;
          const stdDev = Math.sqrt(variance);

          return Math.max(0, 100 - (stdDev * 5));
        }
      },

      {
        id: 'time_preferences',
        name: 'Time Preference Satisfaction',
        weight: 0.15,
        score: (solution: TimetableSolution) => {
          // Score based on how well time preferences are met
          // Would need to load teacher and subject preferences
          return 75; // Placeholder
        }
      },

      {
        id: 'avoid_gaps',
        name: 'Minimize Free Periods',
        weight: 0.1,
        score: (solution: TimetableSolution) => {
          const teacherSchedules = new Map<string, Map<number, number[]>>();
          
          solution.slots.forEach(slot => {
            if (!teacherSchedules.has(slot.teacherId)) {
              teacherSchedules.set(slot.teacherId, new Map());
            }
            
            const schedule = teacherSchedules.get(slot.teacherId)!;
            if (!schedule.has(slot.dayOfWeek)) {
              schedule.set(slot.dayOfWeek, []);
            }
            
            schedule.get(slot.dayOfWeek)!.push(slot.period);
          });

          let totalGapPenalty = 0;
          let teacherCount = 0;

          teacherSchedules.forEach((schedule) => {
            schedule.forEach((periods) => {
              periods.sort((a, b) => a - b);
              
              // Count gaps between first and last period
              if (periods.length > 1) {
                const firstPeriod = periods[0];
                const lastPeriod = periods[periods.length - 1];
                const expectedPeriods = lastPeriod - firstPeriod + 1;
                const gaps = expectedPeriods - periods.length;
                totalGapPenalty += gaps;
              }
            });
            teacherCount++;
          });

          const avgGaps = teacherCount > 0 ? totalGapPenalty / teacherCount : 0;
          return Math.max(0, 100 - (avgGaps * 20));
        }
      }
    ];
  }
}

// ============================================
// GENETIC ALGORITHM IMPLEMENTATION
// ============================================

class TimetableGeneticAlgorithm {
  private context: GenerationContext;
  private hardConstraints: HardConstraint[];
  private softConstraints: SoftConstraint[];
  private populationSize: number;
  private maxGenerations: number;
  private mutationRate: number;
  private crossoverRate: number;

  constructor(
    context: GenerationContext,
    populationSize = 100,
    maxGenerations = 1000,
    mutationRate = 0.1,
    crossoverRate = 0.8
  ) {
    this.context = context;
    this.hardConstraints = HardConstraints.getConstraints(context);
    this.softConstraints = SoftConstraints.getConstraints();
    this.populationSize = populationSize;
    this.maxGenerations = maxGenerations;
    this.mutationRate = mutationRate;
    this.crossoverRate = crossoverRate;
  }

  async generate(): Promise<TimetableSolution> {
    console.log('Starting genetic algorithm generation...');
    
    // Initialize population
    let population = this.initializePopulation();
    
    // Evaluate initial population
    population = population.map(solution => this.evaluateSolution(solution));
    
    let bestSolution = this.getBestSolution(population);
    let generation = 0;
    let stagnationCount = 0;
    const maxStagnation = 50;

    while (generation < this.maxGenerations && stagnationCount < maxStagnation) {
      const previousBestScore = bestSolution.qualityScore || 0;
      
      // Selection
      const parents = this.selection(population);
      
      // Crossover and Mutation
      const offspring = this.reproduction(parents);
      
      // Evaluate offspring
      const evaluatedOffspring = offspring.map(solution => this.evaluateSolution(solution));
      
      // Replacement (elitist strategy)
      population = this.replacement(population, evaluatedOffspring);
      
      // Update best solution
      const currentBest = this.getBestSolution(population);
      if ((currentBest.qualityScore || 0) > previousBestScore) {
        bestSolution = currentBest;
        stagnationCount = 0;
      } else {
        stagnationCount++;
      }
      
      generation++;
      
      // Log progress every 100 generations
      if (generation % 100 === 0) {
        console.log(`Generation ${generation}: Best score = ${bestSolution.qualityScore?.toFixed(2)}, Violations = ${bestSolution.violations.length}`);
      }
      
      // Early termination if perfect solution found
      if (bestSolution.violations.length === 0 && (bestSolution.qualityScore || 0) > 95) {
        console.log(`Perfect solution found at generation ${generation}`);
        break;
      }
    }

    console.log(`Generation completed. Final score: ${bestSolution.qualityScore?.toFixed(2)}`);
    return bestSolution;
  }

  private initializePopulation(): TimetableSolution[] {
    const population: TimetableSolution[] = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      const solution = this.createRandomSolution();
      population.push(solution);
    }
    
    return population;
  }

  private createRandomSolution(): TimetableSolution {
    const slots: TimetableSlot[] = [];
    const { classes, subjects, teachers, rooms, timeStructure, requirements } = this.context;
    
    // Create slots based on subject period requirements
    requirements.forEach((req: any) => {
      const availableTeachers = teachers.filter((t: any) => 
        t.staffSubjects?.some((ss: any) => 
          ss.subjectId === req.subjectId && ss.classId === req.classId
        )
      );
      
      if (availableTeachers.length === 0) return;
      
      for (let period = 0; period < req.periodsPerWeek; period++) {
        const randomDay = Math.floor(Math.random() * 5) + 1; // 1-5 for weekdays
        const randomPeriod = Math.floor(Math.random() * timeStructure.periodsPerDay) + 1;
        const randomTeacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)];
        const randomRoom = rooms.length > 0 ? rooms[Math.floor(Math.random() * rooms.length)] : null;
        
        slots.push({
          id: `${req.classId}-${req.subjectId}-${period}`,
          timetableId: '', // Will be set later
          dayOfWeek: randomDay,
          period: randomPeriod,
          classId: req.classId,
          subjectId: req.subjectId,
          teacherId: randomTeacher.id,
          roomId: randomRoom?.id || null,
          roomName: randomRoom?.name || null,
          duration: 40,
          isDoubleSlot: false,
          notes: req.practicalPeriods > period ? 'PRACTICAL' : null,
          createdAt: new Date(),
          updatedAt: new Date()
        } as TimetableSlot);
      }
    });
    
    return {
      slots,
      schoolId: this.context.schoolId,
      termId: this.context.termId,
      violations: []
    };
  }

  private evaluateSolution(solution: TimetableSolution): TimetableSolution {
    // Check hard constraints
    const violations: ConstraintViolation[] = [];
    
    this.hardConstraints.forEach(constraint => {
      const constraintViolations = constraint.validate(solution);
      violations.push(...constraintViolations);
    });
    
    // Calculate soft constraint score
    let totalScore = 0;
    let totalWeight = 0;
    
    this.softConstraints.forEach(constraint => {
      const score = constraint.score(solution);
      totalScore += score * constraint.weight;
      totalWeight += constraint.weight;
    });
    
    const qualityScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Penalize hard constraint violations
    const violationPenalty = violations.length * 50;
    const finalScore = Math.max(0, qualityScore - violationPenalty);
    
    return {
      ...solution,
      qualityScore: finalScore,
      violations
    };
  }

  private selection(population: TimetableSolution[]): TimetableSolution[] {
    // Tournament selection
    const parents: TimetableSolution[] = [];
    const tournamentSize = 5;
    
    for (let i = 0; i < this.populationSize; i++) {
      const tournament: TimetableSolution[] = [];
      
      for (let j = 0; j < tournamentSize; j++) {
        const randomIndex = Math.floor(Math.random() * population.length);
        tournament.push(population[randomIndex]);
      }
      
      // Select best from tournament
      const winner = tournament.reduce((best, current) => 
        (current.qualityScore || 0) > (best.qualityScore || 0) ? current : best
      );
      
      parents.push(winner);
    }
    
    return parents;
  }

  private reproduction(parents: TimetableSolution[]): TimetableSolution[] {
    const offspring: TimetableSolution[] = [];
    
    for (let i = 0; i < parents.length; i += 2) {
      const parent1 = parents[i];
      const parent2 = parents[i + 1] || parents[0];
      
      let child1 = { ...parent1 };
      let child2 = { ...parent2 };
      
      // Crossover
      if (Math.random() < this.crossoverRate) {
        [child1, child2] = this.crossover(parent1, parent2);
      }
      
      // Mutation
      if (Math.random() < this.mutationRate) {
        child1 = this.mutate(child1);
      }
      if (Math.random() < this.mutationRate) {
        child2 = this.mutate(child2);
      }
      
      offspring.push(child1, child2);
    }
    
    return offspring.slice(0, this.populationSize);
  }

  private crossover(parent1: TimetableSolution, parent2: TimetableSolution): [TimetableSolution, TimetableSolution] {
    // Single-point crossover on slots
    const crossoverPoint = Math.floor(Math.random() * parent1.slots.length);
    
    const child1Slots = [
      ...parent1.slots.slice(0, crossoverPoint),
      ...parent2.slots.slice(crossoverPoint)
    ];
    
    const child2Slots = [
      ...parent2.slots.slice(0, crossoverPoint),
      ...parent1.slots.slice(crossoverPoint)
    ];
    
    return [
      { ...parent1, slots: child1Slots, violations: [] },
      { ...parent2, slots: child2Slots, violations: [] }
    ];
  }

  private mutate(solution: TimetableSolution): TimetableSolution {
    const mutatedSlots = [...solution.slots];
    const mutationCount = Math.max(1, Math.floor(mutatedSlots.length * 0.1));
    
    for (let i = 0; i < mutationCount; i++) {
      const randomIndex = Math.floor(Math.random() * mutatedSlots.length);
      const slot = mutatedSlots[randomIndex];
      
      // Randomly mutate day, period, or teacher
      const mutationType = Math.floor(Math.random() * 3);
      
      switch (mutationType) {
        case 0: // Change day
          slot.dayOfWeek = Math.floor(Math.random() * 5) + 1;
          break;
        case 1: // Change period
          slot.period = Math.floor(Math.random() * this.context.timeStructure.periodsPerDay) + 1;
          break;
        case 2: // Change teacher (if multiple qualified)
          const qualifiedTeachers = this.context.teachers.filter((t: any) => 
            t.staffSubjects?.some((ss: any) => 
              ss.subjectId === slot.subjectId && ss.classId === slot.classId
            )
          );
          if (qualifiedTeachers.length > 1) {
            const newTeacher = qualifiedTeachers[Math.floor(Math.random() * qualifiedTeachers.length)];
            slot.teacherId = newTeacher.id;
          }
          break;
      }
    }
    
    return { ...solution, slots: mutatedSlots, violations: [] };
  }

  private replacement(population: TimetableSolution[], offspring: TimetableSolution[]): TimetableSolution[] {
    // Elitist replacement: keep best solutions
    const combined = [...population, ...offspring];
    combined.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    
    return combined.slice(0, this.populationSize);
  }

  private getBestSolution(population: TimetableSolution[]): TimetableSolution {
    return population.reduce((best, current) => 
      (current.qualityScore || 0) > (best.qualityScore || 0) ? current : best
    );
  }
}

// ============================================
// MAIN CONSTRAINT ENGINE SERVICE
// ============================================

export class TimetableConstraintEngine {
  async generateTimetable(
    schoolId: string,
    termId: string,
    settings?: any
  ): Promise<TimetableSolution> {
    console.log(`Starting timetable generation for school ${schoolId}, term ${termId}`);
    
    // Load generation context
    const context = await this.loadGenerationContext(schoolId, termId);
    
    // Initialize genetic algorithm
    const algorithm = new TimetableGeneticAlgorithm(
      context,
      settings?.populationSize || 100,
      settings?.maxGenerations || 1000,
      settings?.mutationRate || 0.1,
      settings?.crossoverRate || 0.8
    );
    
    // Generate solution
    const solution = await algorithm.generate();
    
    console.log(`Generation completed with quality score: ${solution.qualityScore?.toFixed(2)}`);
    return solution;
  }

  async validateSolution(solution: TimetableSolution, context?: GenerationContext): Promise<ConstraintViolation[]> {
    const ctx = context || await this.loadGenerationContext(solution.schoolId, solution.termId);
    const hardConstraints = HardConstraints.getConstraints(ctx);
    const violations: ConstraintViolation[] = [];
    
    hardConstraints.forEach(constraint => {
      const constraintViolations = constraint.validate(solution);
      violations.push(...constraintViolations);
    });
    
    return violations;
  }

  async scoreSolution(solution: TimetableSolution): Promise<number> {
    const softConstraints = SoftConstraints.getConstraints();
    let totalScore = 0;
    let totalWeight = 0;
    
    softConstraints.forEach(constraint => {
      const score = constraint.score(solution);
      totalScore += score * constraint.weight;
      totalWeight += constraint.weight;
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  calculateTimetableQuality(timetable: any): number {
    // Calculate quality score based on constraints satisfaction
    const softConstraints = SoftConstraints.getConstraints();
    let totalScore = 0;
    let totalWeight = 0;
    
    softConstraints.forEach(constraint => {
      const score = constraint.score(timetable);
      totalScore += score * constraint.weight;
      totalWeight += constraint.weight;
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  validateCompleteTimetable(timetable: any): ConstraintViolation[] {
    const hardConstraints = HardConstraints.getConstraints({} as GenerationContext);
    const violations: ConstraintViolation[] = [];
    
    hardConstraints.forEach(constraint => {
      const constraintViolations = constraint.validate(timetable);
      violations.push(...constraintViolations);
    });
    
    return violations;
  }

  validateHardConstraints(slot: any, timetable: any): ConstraintViolation[] {
    // Validate a single slot against hard constraints
    const hardConstraints = HardConstraints.getConstraints({} as GenerationContext);
    const violations: ConstraintViolation[] = [];
    
    hardConstraints.forEach(constraint => {
      const constraintViolations = constraint.validate({ slots: [slot] } as TimetableSolution);
      violations.push(...constraintViolations);
    });
    
    return violations;
  }

  private async loadGenerationContext(schoolId: string, termId: string): Promise<GenerationContext> {
    const [
      classes,
      subjects,
      teachers,
      rooms,
      timeStructure,
      requirements,
      teacherConstraints,
      roomConstraints
    ] = await Promise.all([
      db.class.findMany({ where: { schoolId } }),
      db.subject.findMany({ where: { schoolId, isActive: true } }),
      db.staff.findMany({ 
        where: { schoolId, status: 'ACTIVE' },
        include: { staffSubjects: true }
      }),
      db.room.findMany({ where: { schoolId, isActive: true } }),
      db.schoolTimeStructure.findFirst({ where: { schoolId, isActive: true } }),
      db.subjectPeriodRequirement.findMany({ where: { schoolId } }),
      db.teacherConstraint.findMany({ where: { schoolId } }),
      db.roomConstraint.findMany({ where: { schoolId } })
    ]);

    if (!timeStructure) {
      throw new Error('No active time structure found. Please configure school time structure first.');
    }

    return {
      schoolId,
      termId,
      classes,
      subjects,
      teachers,
      rooms,
      timeStructure,
      requirements,
      teacherConstraints,
      roomConstraints
    };
  }
}

export const timetableConstraintEngine = new TimetableConstraintEngine();