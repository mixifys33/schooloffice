/**
 * Timetable Validation Service
 * 
 * Provides comprehensive validation for timetable operations with:
 * - Configuration validation
 * - Entry data validation
 * - Time format validation
 * - Clear error messages
 * 
 * @module services/timetable-validator
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ConfigurationValidationParams {
  startTime: string;
  endTime: string;
  periodDurationMinutes: number;
  specialPeriods?: SpecialPeriodInput[];
}

export interface SpecialPeriodInput {
  name: string;
  startTime: string;
  endTime: string;