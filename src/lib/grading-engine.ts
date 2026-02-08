/**
 * Grading Engine for Class Teacher Marks Management System
 * 
 * Implements sophisticated new curriculum grading logic with proper separation
 * between raw CA entries, CA aggregation, and final weighting calculations.
 * 
 * Requirements: 24.1, 24.2, 24.3, 25.3, 30.2
 */

export interface CAEntry {
  id: string;
  subjectId: string;
  studentId: string;
  teacherId: string;
  termId: string;
  name: string;
  type: 'ASSIGNMENT' | 'TEST' | 'PROJECT' | 'PRACTICAL' | 'OBSERVATION';
  maxScore: number;
  rawScore: number;
  date: Date;
  competencyId?: string;
  competencyComment?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamEntry {
  id: string;
  subjectId: string;
  studentId: string;
  teacherId: string;
  termId: string;
  examScore: number;
  maxScore: number; // Always 100
  examDate: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeCalculation {
  studentId: string;
  subjectId: string;
  termId: string;

  // CA Calculation
  caEntries: CAEntry[];
  caPercentages: number[]; // Each CA converted to percentage
  averageCAPercentage: number; // Mean of all CA percentages
  caContribution: number; // Out of 20 (averageCAPercentage * 0.2)

  // Exam Calculation
  examEntry?: ExamEntry;
  examContribution: number; // Out of 80 ((examScore / 100) * 80)

  // Final Calculation
  finalScore: number; // caContribution + examContribution

  // Status
  hasCA: boolean;
  hasExam: boolean;
  isComplete: boolean; // Both CA and Exam approved

  // Metadata
  calculatedAt: Date;
  lastUpdated: Date;
}

export interface CalculationBreakdown {
  studentId: string;
  subjectId: string;
  termId: string;
  
  // Step-by-step breakdown
  steps: {
    step: number;
    description: string;
    formula: string;
    calculation: string;
    result: number;
  }[];
  
  // Final summary
  summary: {
    caContribution: number;
    examContribution: number;
    finalScore: number;
    grade?: string;
  };
}

/**
 * Core Grading Engine implementing new curriculum mathematics
 * 
 * Key principles:
 * - CA entries are converted to percentages individually
 * - CA contribution is average of all CA percentages × 20%
 * - Exam contribution is exam score × 80%
 * - Final score is CA contribution + Exam contribution
 * - All calculations maintain precision to 2 decimal places
 */
export class GradingEngine {
  
  /**
   * Calculate CA contribution from multiple CA entries
   * Formula: Average of all CA percentages × 20
   * 
   * Requirements: 24.1, 24.2, 24.3
   */
  calculateCAContribution(caEntries: CAEntry[]): number {
    if (caEntries.length === 0) return 0;

    // Convert each CA entry to percentage (Raw Score ÷ Max Score × 100)
    const caPercentages = caEntries.map(
      (entry) => (entry.rawScore / entry.maxScore) * 100
    );

    // Calculate average percentage
    const averagePercentage = 
      caPercentages.reduce((sum, pct) => sum + pct, 0) / caPercentages.length;

    // Convert to CA contribution (out of 20)
    // Formula: Average CA Percentage × 20 ÷ 100
    const caContribution = (averagePercentage / 100) * 20;

    // Round to 2 decimal places for precision
    return Math.round(caContribution * 100) / 100;
  }

  /**
   * Calculate individual CA percentage
   * Formula: (Raw Score ÷ Max Score) × 100
   * 
   * Requirements: 24.1
   */
  calculateCAPercentage(rawScore: number, maxScore: number): number {
    if (maxScore === 0) return 0;
    
    const percentage = (rawScore / maxScore) * 100;
    return Math.round(percentage * 100) / 100;
  }

  /**
   * Calculate Exam contribution
   * Formula: (Exam Score ÷ 100) × 80
   * 
   * Requirements: 25.3
   */
  calculateExamContribution(examEntry: ExamEntry): number {
    const examContribution = (examEntry.examScore / 100) * 80;
    return Math.round(examContribution * 100) / 100;
  }

  /**
   * Calculate final grade
   * Formula: CA Contribution + Exam Contribution
   * 
   * Requirements: 30.2
   */
  calculateFinalGrade(caContribution: number, examContribution: number): number {
    const finalScore = caContribution + examContribution;
    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Generate complete grade calculation for a student
   * 
   * Requirements: 24.1, 24.2, 24.3, 25.3, 30.2
   */
  generateGradeCalculation(
    studentId: string,
    subjectId: string,
    termId: string,
    caEntries: CAEntry[],
    examEntry?: ExamEntry
  ): GradeCalculation {
    const caContribution = this.calculateCAContribution(caEntries);
    const examContribution = examEntry 
      ? this.calculateExamContribution(examEntry) 
      : 0;
    const finalScore = this.calculateFinalGrade(caContribution, examContribution);

    // Calculate individual CA percentages
    const caPercentages = caEntries.map(entry => 
      this.calculateCAPercentage(entry.rawScore, entry.maxScore)
    );

    // Calculate average CA percentage
    const averageCAPercentage = caPercentages.length > 0
      ? caPercentages.reduce((sum, pct) => sum + pct, 0) / caPercentages.length
      : 0;

    return {
      studentId,
      subjectId,
      termId,
      caEntries,
      caPercentages,
      averageCAPercentage: Math.round(averageCAPercentage * 100) / 100,
      caContribution,
      examEntry,
      examContribution,
      finalScore,
      hasCA: caEntries.length > 0,
      hasExam: !!examEntry,
      isComplete: caEntries.length > 0 && !!examEntry,
      calculatedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate detailed calculation breakdown for transparency
   * 
   * Requirements: 30.1, 30.5
   */
  generateCalculationBreakdown(
    studentId: string,
    subjectId: string,
    termId: string,
    caEntries: CAEntry[],
    examEntry?: ExamEntry
  ): CalculationBreakdown {
    const steps: CalculationBreakdown['steps'] = [];
    let stepNumber = 1;

    // Step 1: Individual CA percentages
    const caPercentages: number[] = [];
    caEntries.forEach((entry, index) => {
      const percentage = this.calculateCAPercentage(entry.rawScore, entry.maxScore);
      caPercentages.push(percentage);
      
      steps.push({
        step: stepNumber++,
        description: `Convert ${entry.name} to percentage`,
        formula: '(Raw Score ÷ Max Score) × 100',
        calculation: `(${entry.rawScore} ÷ ${entry.maxScore}) × 100`,
        result: percentage
      });
    });

    // Step 2: Average CA percentage
    let averageCAPercentage = 0;
    if (caPercentages.length > 0) {
      const sum = caPercentages.reduce((acc, pct) => acc + pct, 0);
      averageCAPercentage = sum / caPercentages.length;
      
      steps.push({
        step: stepNumber++,
        description: 'Calculate average CA percentage',
        formula: 'Sum of all CA percentages ÷ Number of CAs',
        calculation: `(${caPercentages.join(' + ')}) ÷ ${caPercentages.length}`,
        result: Math.round(averageCAPercentage * 100) / 100
      });
    }

    // Step 3: CA contribution (out of 20)
    const caContribution = (averageCAPercentage / 100) * 20;
    if (caPercentages.length > 0) {
      steps.push({
        step: stepNumber++,
        description: 'Calculate CA contribution (20% weighting)',
        formula: 'Average CA Percentage × 20 ÷ 100',
        calculation: `${Math.round(averageCAPercentage * 100) / 100} × 20 ÷ 100`,
        result: Math.round(caContribution * 100) / 100
      });
    }

    // Step 4: Exam contribution (out of 80)
    let examContribution = 0;
    if (examEntry) {
      examContribution = (examEntry.examScore / 100) * 80;
      steps.push({
        step: stepNumber++,
        description: 'Calculate Exam contribution (80% weighting)',
        formula: '(Exam Score ÷ 100) × 80',
        calculation: `(${examEntry.examScore} ÷ 100) × 80`,
        result: Math.round(examContribution * 100) / 100
      });
    }

    // Step 5: Final score
    const finalScore = caContribution + examContribution;
    if (caPercentages.length > 0 || examEntry) {
      steps.push({
        step: stepNumber++,
        description: 'Calculate final score',
        formula: 'CA Contribution + Exam Contribution',
        calculation: `${Math.round(caContribution * 100) / 100} + ${Math.round(examContribution * 100) / 100}`,
        result: Math.round(finalScore * 100) / 100
      });
    }

    return {
      studentId,
      subjectId,
      termId,
      steps,
      summary: {
        caContribution: Math.round(caContribution * 100) / 100,
        examContribution: Math.round(examContribution * 100) / 100,
        finalScore: Math.round(finalScore * 100) / 100
      }
    };
  }

  /**
   * Validate CA entry scores against maximum
   * 
   * Requirements: 6.1, 6.2, 7.1
   */
  validateCAEntry(rawScore: number, maxScore: number): { isValid: boolean; error?: string } {
    if (rawScore < 0) {
      return { isValid: false, error: 'Score cannot be negative' };
    }
    
    if (rawScore > maxScore) {
      return { isValid: false, error: `Score cannot exceed maximum of ${maxScore}` };
    }
    
    if (maxScore <= 0) {
      return { isValid: false, error: 'Maximum score must be greater than 0' };
    }
    
    return { isValid: true };
  }

  /**
   * Validate exam entry scores
   * 
   * Requirements: 25.2, 25.6
   */
  validateExamEntry(examScore: number): { isValid: boolean; error?: string } {
    if (examScore < 0) {
      return { isValid: false, error: 'Exam score cannot be negative' };
    }
    
    if (examScore > 100) {
      return { isValid: false, error: 'Exam score cannot exceed 100' };
    }
    
    return { isValid: true };
  }

  /**
   * Batch validate multiple entries
   * 
   * Requirements: 8.1
   */
  batchValidateEntries(
    caEntries: { rawScore: number; maxScore: number }[],
    examEntries: { examScore: number }[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate CA entries
    caEntries.forEach((entry, index) => {
      const validation = this.validateCAEntry(entry.rawScore, entry.maxScore);
      if (!validation.isValid) {
        errors.push(`CA Entry ${index + 1}: ${validation.error}`);
      }
    });

    // Validate exam entries
    examEntries.forEach((entry, index) => {
      const validation = this.validateExamEntry(entry.examScore);
      if (!validation.isValid) {
        errors.push(`Exam Entry ${index + 1}: ${validation.error}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const gradingEngine = new GradingEngine();