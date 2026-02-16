/**
 * Competency-Based Assessment Types
 * Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7
 */

export enum CompetencyLevel {
  EMERGING = "EMERGING",
  DEVELOPING = "DEVELOPING", 
  PROFICIENT = "PROFICIENT",
  ADVANCED = "ADVANCED"
}

export enum CompetencyType {
  KNOWLEDGE = "KNOWLEDGE",
  SKILLS = "SKILLS", 
  VALUES_ATTITUDES = "VALUES_ATTITUDES",
  GENERIC_SKILLS = "GENERIC_SKILLS"
}

export interface Competency {
  id: string;
  code: string; // e.g., "M1.1", "E2.3"
  title: string;
  description: string;
  type: CompetencyType;
  subjectId: string;
  classId: string;
  level: CompetencyLevel;
  parentCompetencyId?: string; // For hierarchical competencies
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetencyProgress {
  id: string;
  studentId: string;
  competencyId: string;
  currentLevel: CompetencyLevel;
  evidenceCount: number;
  lastAssessedAt: Date;
  teacherComment?: string;
  averageScore: number; // Average of all CA entries linked to this competency
  masteryPercentage: number; // Calculated mastery level
}

export interface CompetencyMapping {
  id: string;
  caEntryId: string;
  competencyId: string;
  evidenceType: string; // Type of evidence this CA provides
  weight: number; // How much this CA contributes to competency mastery
  teacherComment?: string;
  createdAt: Date;
}

export interface CompetencyReport {
  studentId: string;
  subjectId: string;
  termId: string;
  competencies: Array<{
    competency: Competency;
    progress: CompetencyProgress;
    evidences: Array<{
      caEntryId: string;
      caEntryName: string;
      score: number;
      maxScore: number;
      percentage: number;
      date: Date;
      teacherComment?: string;
    }>;
    masteryLevel: CompetencyLevel;
    recommendations: string[];
  }>;
  overallMastery: {
    knowledgeLevel: CompetencyLevel;
    skillsLevel: CompetencyLevel;
    valuesLevel: CompetencyLevel;
    genericSkillsLevel: CompetencyLevel;
  };
  generatedAt: Date;
}

export interface CompetencyAuditTrail {
  id: string;
  competencyId: string;
  studentId: string;
  action: string; // LINKED, UNLINKED, LEVEL_CHANGED, COMMENT_ADDED
  previousValue?: any;
  newValue?: any;
  performedBy: string;
  performedAt: Date;
  reason?: string;
}