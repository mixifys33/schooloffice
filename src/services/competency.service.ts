/**
 * Competency Service
 * Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7
 */
    
import { prisma } from '@/lib/db';
import { 
  Competency, 
  CompetencyProgress, 
  CompetencyMapping, 
  CompetencyReport,
  CompetencyLevel,
  CompetencyType,
  CompetencyAuditTrail
} from '@/types/competency';

export class CompetencyService {
  /**
   * Create a new competency
   * Requirements: 31.1, 31.7
   */
  async createCompetency(data: {
    schoolId: string;
    subjectId: string;
    classId: string;
    code: string;
    title: string;
    description: string;
    type: CompetencyType;
    level?: CompetencyLevel;
    parentCompetencyId?: string;
    createdBy: string;
  }): Promise<Competency> {
    const competency = await prisma.competency.create({
      data: {
        schoolId: data.schoolId,
        subjectId: data.subjectId,
        classId: data.classId,
        code: data.code,
        title: data.title,
        description: data.description,
        type: data.type,
        level: data.level || CompetencyLevel.DEVELOPING,
        parentCompetencyId: data.parentCompetencyId,
        createdBy: data.createdBy,
      },
    });

    // Create audit trail
    await this.createAuditTrail({
      competencyId: competency.id,
      action: 'COMPETENCY_CREATED',
      newValue: competency,
      performedBy: data.createdBy,
    });

    return competency as Competency;
  }

  /**
   * Link CA entry to competency
   * Requirements: 31.1, 31.4
   */
  async linkCAEntryToCompetency(data: {
    caEntryId: string;
    competencyId: string;
    evidenceType: string;
    weight?: number;
    teacherComment?: string;
    createdBy: string;
  }): Promise<CompetencyMapping> {
    const mapping = await prisma.competencyMapping.create({
      data: {
        caEntryId: data.caEntryId,
        competencyId: data.competencyId,
        evidenceType: data.evidenceType,
        weight: data.weight || 1.0,
        teacherComment: data.teacherComment,
        createdBy: data.createdBy,
      },
    });

    // Update competency progress for all affected students
    await this.updateCompetencyProgressForCAEntry(data.caEntryId, data.competencyId);

    // Create audit trail
    await this.createAuditTrail({
      competencyId: data.competencyId,
      action: 'CA_ENTRY_LINKED',
      newValue: { caEntryId: data.caEntryId, evidenceType: data.evidenceType },
      performedBy: data.createdBy,
    });

    return mapping as CompetencyMapping;
  }

  /**
   * Update competency progress based on CA entries
   * Requirements: 31.2, 31.5
   */
  async updateCompetencyProgressForCAEntry(caEntryId: string, competencyId: string): Promise<void> {
    // Get the CA entry details
    const caEntry = await prisma.cAEntry.findUnique({
      where: { id: caEntryId },
      include: {
        student: true,
        term: true,
      },
    });

    if (!caEntry) return;

    // Get all CA entries linked to this competency for this student
    const linkedCAEntries = await prisma.cAEntry.findMany({
      where: {
        studentId: caEntry.studentId,
        competencyMappings: {
          some: {
            competencyId: competencyId,
          },
        },
      },
      include: {
        competencyMappings: {
          where: { competencyId: competencyId },
        },
      },
    });

    // Calculate competency progress
    const totalScore = linkedCAEntries.reduce((sum, entry) => {
      const percentage = (entry.rawScore / entry.maxScore) * 100;
      const weight = entry.competencyMappings[0]?.weight || 1.0;
      return sum + (percentage * weight);
    }, 0);

    const totalWeight = linkedCAEntries.reduce((sum, entry) => {
      return sum + (entry.competencyMappings[0]?.weight || 1.0);
    }, 0);

    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const masteryPercentage = Math.min(averageScore, 100);

    // Determine competency level based on mastery percentage
    let currentLevel: CompetencyLevel;
    if (masteryPercentage >= 85) {
      currentLevel = CompetencyLevel.ADVANCED;
    } else if (masteryPercentage >= 70) {
      currentLevel = CompetencyLevel.PROFICIENT;
    } else if (masteryPercentage >= 50) {
      currentLevel = CompetencyLevel.DEVELOPING;
    } else {
      currentLevel = CompetencyLevel.EMERGING;
    }

    // Update or create competency progress
    await prisma.competencyProgress.upsert({
      where: {
        studentId_competencyId_termId: {
          studentId: caEntry.studentId,
          competencyId: competencyId,
          termId: caEntry.termId,
        },
      },
      update: {
        currentLevel: currentLevel,
        evidenceCount: linkedCAEntries.length,
        averageScore: Math.round(averageScore * 100) / 100,
        masteryPercentage: Math.round(masteryPercentage * 100) / 100,
        lastAssessedAt: new Date(),
        lastUpdatedBy: caEntry.teacherId,
      },
      create: {
        studentId: caEntry.studentId,
        competencyId: competencyId,
        termId: caEntry.termId,
        currentLevel: currentLevel,
        evidenceCount: linkedCAEntries.length,
        averageScore: Math.round(averageScore * 100) / 100,
        masteryPercentage: Math.round(masteryPercentage * 100) / 100,
        lastAssessedAt: new Date(),
        lastUpdatedBy: caEntry.teacherId,
      },
    });

    // Create audit trail for progress update
    await this.createAuditTrail({
      competencyId: competencyId,
      studentId: caEntry.studentId,
      action: 'PROGRESS_UPDATED',
      newValue: { 
        currentLevel, 
        masteryPercentage, 
        evidenceCount: linkedCAEntries.length 
      },
      performedBy: caEntry.teacherId,
    });
  }

  /**
   * Generate competency-based report for a student
   * Requirements: 31.3, 31.6
   */
  async generateCompetencyReport(
    studentId: string,
    subjectId: string,
    termId: string
  ): Promise<CompetencyReport> {
    // Get all competencies for the subject and class
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const competencies = await prisma.competency.findMany({
      where: {
        subjectId: subjectId,
        classId: student.classId,
        isActive: true,
      },
      include: {
        progressRecords: {
          where: {
            studentId: studentId,
            termId: termId,
          },
        },
        mappings: {
          include: {
            caEntry: {
              where: {
                studentId: studentId,
                termId: termId,
              },
            },
          },
        },
      },
    });

    const competencyData = await Promise.all(
      competencies.map(async (competency) => {
        const progress = competency.progressRecords[0];
        const evidences = competency.mappings
          .filter(mapping => mapping.caEntry.length > 0)
          .map(mapping => ({
            caEntryId: mapping.caEntry[0].id,
            caEntryName: mapping.caEntry[0].name,
            score: mapping.caEntry[0].rawScore,
            maxScore: mapping.caEntry[0].maxScore,
            percentage: (mapping.caEntry[0].rawScore / mapping.caEntry[0].maxScore) * 100,
            date: mapping.caEntry[0].date,
            teacherComment: mapping.teacherComment,
          }));

        const masteryLevel = progress?.currentLevel || CompetencyLevel.EMERGING;
        const recommendations = this.generateRecommendations(masteryLevel, competency.type);

        return {
          competency: competency as Competency,
          progress: progress as CompetencyProgress,
          evidences,
          masteryLevel,
          recommendations,
        };
      })
    );

    // Calculate overall mastery by competency type
    const overallMastery = this.calculateOverallMastery(competencyData);

    return {
      studentId,
      subjectId,
      termId,
      competencies: competencyData,
      overallMastery,
      generatedAt: new Date(),
    };
  }

  /**
   * Get competency progress for a student
   * Requirements: 31.2
   */
  async getStudentCompetencyProgress(
    studentId: string,
    subjectId: string,
    termId: string
  ): Promise<CompetencyProgress[]> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const progress = await prisma.competencyProgress.findMany({
      where: {
        studentId: studentId,
        termId: termId,
        competency: {
          subjectId: subjectId,
          classId: student.classId,
          isActive: true,
        },
      },
      include: {
        competency: true,
      },
    });

    return progress as CompetencyProgress[];
  }

  /**
   * Add competency comment to CA entry
   * Requirements: 31.4
   */
  async addCompetencyComment(
    caEntryId: string,
    competencyId: string,
    comment: string,
    performedBy: string
  ): Promise<void> {
    await prisma.competencyMapping.updateMany({
      where: {
        caEntryId: caEntryId,
        competencyId: competencyId,
      },
      data: {
        teacherComment: comment,
      },
    });

    // Create audit trail
    await this.createAuditTrail({
      competencyId: competencyId,
      action: 'COMMENT_ADDED',
      newValue: { caEntryId, comment },
      performedBy: performedBy,
    });
  }

  /**
   * Get competencies for a subject and class
   * Requirements: 31.7
   */
  async getCompetenciesForSubject(
    subjectId: string,
    classId: string
  ): Promise<Competency[]> {
    const competencies = await prisma.competency.findMany({
      where: {
        subjectId: subjectId,
        classId: classId,
        isActive: true,
      },
      orderBy: [
        { type: 'asc' },
        { code: 'asc' },
      ],
    });

    return competencies as Competency[];
  }

  /**
   * Create audit trail entry
   * Requirements: 32.1, 32.6
   */
  private async createAuditTrail(data: {
    competencyId: string;
    studentId?: string;
    action: string;
    previousValue?: any;
    newValue?: any;
    performedBy: string;
    reason?: string;
  }): Promise<CompetencyAuditTrail> {
    const auditEntry = await prisma.competencyAuditTrail.create({
      data: {
        competencyId: data.competencyId,
        studentId: data.studentId,
        action: data.action,
        previousValue: data.previousValue,
        newValue: data.newValue,
        performedBy: data.performedBy,
        reason: data.reason,
      },
    });

    return auditEntry as CompetencyAuditTrail;
  }

  /**
   * Generate recommendations based on mastery level
   */
  private generateRecommendations(level: CompetencyLevel, type: CompetencyType): string[] {
    const recommendations: string[] = [];

    switch (level) {
      case CompetencyLevel.EMERGING:
        recommendations.push('Provide additional support and scaffolding');
        recommendations.push('Break down tasks into smaller, manageable steps');
        recommendations.push('Offer more practice opportunities');
        break;
      case CompetencyLevel.DEVELOPING:
        recommendations.push('Continue with guided practice');
        recommendations.push('Provide constructive feedback');
        recommendations.push('Encourage peer collaboration');
        break;
      case CompetencyLevel.PROFICIENT:
        recommendations.push('Provide extension activities');
        recommendations.push('Encourage independent application');
        recommendations.push('Consider leadership opportunities');
        break;
      case CompetencyLevel.ADVANCED:
        recommendations.push('Provide advanced challenges');
        recommendations.push('Encourage mentoring of peers');
        recommendations.push('Explore real-world applications');
        break;
    }

    return recommendations;
  }

  /**
   * Calculate overall mastery by competency type
   */
  private calculateOverallMastery(competencyData: any[]): {
    knowledgeLevel: CompetencyLevel;
    skillsLevel: CompetencyLevel;
    valuesLevel: CompetencyLevel;
    genericSkillsLevel: CompetencyLevel;
  } {
    const calculateLevelForType = (type: CompetencyType): CompetencyLevel => {
      const typeCompetencies = competencyData.filter(
        item => item.competency.type === type
      );
      
      if (typeCompetencies.length === 0) return CompetencyLevel.EMERGING;

      const totalMastery = typeCompetencies.reduce(
        (sum, item) => sum + (item.progress?.masteryPercentage || 0),
        0
      );
      
      const averageMastery = totalMastery / typeCompetencies.length;

      if (averageMastery >= 85) return CompetencyLevel.ADVANCED;
      if (averageMastery >= 70) return CompetencyLevel.PROFICIENT;
      if (averageMastery >= 50) return CompetencyLevel.DEVELOPING;
      return CompetencyLevel.EMERGING;
    };

    return {
      knowledgeLevel: calculateLevelForType(CompetencyType.KNOWLEDGE),
      skillsLevel: calculateLevelForType(CompetencyType.SKILLS),
      valuesLevel: calculateLevelForType(CompetencyType.VALUES_ATTITUDES),
      genericSkillsLevel: calculateLevelForType(CompetencyType.GENERIC_SKILLS),
    };
  }
}

export const competencyService = new CompetencyService();