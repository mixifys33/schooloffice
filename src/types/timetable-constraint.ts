/**
 * TIMETABLE CONSTRAINT SYSTEM TYPES
 * 
 * Type definitions for the brutal timetable architecture.
 * These types enforce the constraint-based approach.
 */

// ============================================
// CORE CONSTRAINT TYPES
// ============================================

export type ConstraintType = 'HARD' | 'SOFT';
export type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type GenerationStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type TimetableStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

// ==