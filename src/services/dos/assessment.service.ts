import { prisma } from '@/lib/db'
import { AssessmentType } from '@prisma/client'
import { z } from 'zod'

// Zod schemas for validation
const CreateAssessmentPlanSchema = z.object({
  curriculumSubjectId: z.string(),
  termId: z.string(),
  teacherId: z.string(),
  assessmentType: z.nativeEnum(AssessmentType),
  title: z.string(),
  description: z.string().optional(),
  maxScore: z.number().positive(),
  weightPercentage: z.number().min(0).max(20),
  dueDate: z.date(),
  teacherRemarks: z.string().optional(),
})

const EnterAssessmentScoreSchema = z.object({
  assessmentPlanId: z.string(),
  studentId: z.string(),
  score: z.number().min(0),
  evidenceUrl: z.string().optional(),
  teacherRemarks: z.string().optional(),
})

export class AssessmentService {
  /**
   * Create assessment plan (within 20% CA allocation)
   */
  static async createAssessmentPlan(data: z.infer<typeof CreateAssessmentPlanSchema>) {
    const validatedData = CreateAssessmentPlanSchema.parse(data)

    // Check total weight allocation for this subject and term
    const existingPlans = await prisma.assessmentPlan.findMany({
      where: {
        curriculumSubjectId: validatedData.curriculumSubjectId,
        termId: validatedData.termId,
      },
    })

    const totalWeight = existingPlans.reduce(
      (sum, plan) => sum + plan.weightPercentage,
      0
    )

    if (totalWeight + validatedData.weightPercentage > 20) {
      throw new Error(
        `Total assessment weight would exceed 20%. Current: ${totalWeight}%, Attempting to add: ${validatedData.weightPercentage}%`
      )
    }

    return await prisma.assessmentPlan.create({
      data: validatedData,
      include: {
        curriculumSubject: {
          include: {
            subject: true,
            class: true,
          },
        },
        term: true,
      },
    })
  }

  /**
   * Get assessment plans for a subject and term
   */
  static async getAssessmentPlans(curriculumSubjectId: string, termId: string) {
    return await prisma.assessmentPlan.findMany({
      where: {
        curriculumSubjectId,
        termId,
      },
      include: {
        continuousAssessments: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })
  }

  /**
   * Enter continuous assessment score
   */
  static async enterAssessmentScore(data: z.infer<typeof EnterAssessmentScoreSchema>) {
    const validatedData = EnterAssessmentScoreSchema.parse(data)

    // Verify assessment plan exists and is not locked
    const assessmentPlan = await prisma.assessmentPlan.findUnique({
      where: { id: validatedData.assessmentPlanId },
    })

    if (!assessmentPlan) {
      throw new Error('Assessment plan not found')
    }

    if (assessmentPlan.isLocked) {
      throw new Error('Assessment plan is locked and cannot be modified')
    }

    // Validate score against max score
    if (validatedData.score > assessmentPlan.maxScore) {
      throw new Error(`Score cannot exceed maximum score of ${assessmentPlan.maxScore}`)
    }

    return await prisma.continuousAssessment.upsert({
      where: {
        assessmentPlanId_studentId: {
          assessmentPlanId: validatedData.assessmentPlanId,
          studentId: validatedData.studentId,
        },
      },
      update: {
        score: validatedData.score,
        evidenceUrl: validatedData.evidenceUrl,
        teacherRemarks: validatedData.teacherRemarks,
        submittedAt: new Date(),
      },
      create: {
        ...validatedData,
        submittedAt: new Date(),
      },
      include: {
        assessmentPlan: true,
        student: true,
        teacher: true,
      },
    })
  }
}