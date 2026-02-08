import { PrismaClient } from '@prisma/client';
import { 
  TeacherSubmission, 
  DosResultsInboxItem, 
  DosApproval, 
  StudentReportCard, 
  ReportCardState, 
  SmsMode, 
  SmsPreview, 
  SmsSendingRequest, 
  SmsSendingResult,
  SecureReportLink,
  SubjectResult
} from '@/types/dos-results';

const prisma = new PrismaClient();

export class DosResultsCollectionService {
  
  /**
   * Step 1: Handle teacher submissions
   */
  async submitTeacherResults(
    teacherId: string,
    classId: string,
    subjectId: string,
    assessmentType: 'CA' | 'EXAM',
    scores: { [studentId: string]: number }
  ): Promise<boolean> {
    try {
      // Validate teacher is assigned to this class/subject
      const staffSubject = await prisma.staffSubject.findFirst({
        where: {
          staffId: teacherId,
          subjectId,
          classId
        }
      });

      if (!staffSubject) {
        throw new Error('Teacher not assigned to this class/subject');
      }

      // Process each student's score
      for (const [studentId, score] of Object.entries(scores)) {
        // Check if student is in the class
        const studentInClass = await prisma.student.findFirst({
          where: {
            id: studentId,
            classId
          }
        });

        if (!studentInClass) {
          throw new Error(`Student ${studentId} not in class ${classId}`);
        }

        // Create or update submission record
        await prisma.teacherAssessmentResult.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: `${assessmentType}_${subjectId}_${classId}`, // This would need to be a real assessment ID
              studentId
            }
          },
          update: {
            score,
            percentage: score,
            enteredAt: new Date(),
            enteredBy: teacherId
          },
          create: {
            assessmentId: `${assessmentType}_${subjectId}_${classId}`,
            studentId,
            score,
            percentage: score,
            enteredAt: new Date(),
            enteredBy: teacherId
          }
        });
      }

      // Update submission status to SUBMITTED
      await prisma.teacherAssessment.upsert({
        where: {
          id: `${assessmentType}_${subjectId}_${classId}`
        },
        update: {
          submittedAt: new Date(),
          submittedBy: teacherId,
          isLocked: false // Will be locked by DoS later
        },
        create: {
          id: `${assessmentType}_${subjectId}_${classId}`,
          staffId: teacherId,
          classId,
          subjectId,
          assessmentType: assessmentType === 'CA' ? 'ASSIGNMENT' : 'EXAM', // Map to existing enum
          name: `${assessmentType} for ${subjectId}`,
          maxScore: assessmentType === 'CA' ? 20 : 80, // CA is 20%, Exam is 80%
          dateAssigned: new Date(),
          isLocked: false
        }
      });

      return true;
    } catch (error) {
      console.error('Error submitting teacher results:', error);
      throw error;
    }
  }

  /**
   * Step 2: DoS Results Inbox - Show all pending submissions
   */
  async getResultsInbox(dosUserId: string): Promise<DosResultsInboxItem[]> {
    try {
      // Get school from DOS user
      const user = await prisma.user.findUnique({
        where: { id: dosUserId },
        include: { school: true }
      });

      if (!user || !user.schoolId) {
        throw new Error('User not associated with a school');
      }

      // Get all classes in the school
      const classes = await prisma.class.findMany({
        where: { schoolId: user.schoolId },
        include: {
          classSubjects: {
            include: {
              subject: true
            }
          },
          staffSubjects: {
            include: {
              staff: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      });

      const inboxItems: DosResultsInboxItem[] = [];

      for (const cls of classes) {
        for (const classSubject of cls.classSubjects) {
          // Find the teacher assigned to this subject
          const teacherSubject = cls.staffSubjects.find(ss => ss.subjectId === classSubject.subjectId);

          if (teacherSubject) {
            // Check CA status
            const caAssessment = await prisma.teacherAssessment.findFirst({
              where: {
                subjectId: classSubject.subjectId,
                classId: cls.id,
                assessmentType: 'ASSIGNMENT' // CA
              }
            });

            // Check Exam status
            const examAssessment = await prisma.teacherAssessment.findFirst({
              where: {
                subjectId: classSubject.subjectId,
                classId: cls.id,
                assessmentType: 'EXAM'
              }
            });

            // Calculate completeness
            const studentsInClass = await prisma.student.count({
              where: { classId: cls.id }
            });

            let caSubmitted = 0;
            let examSubmitted = 0;

            if (caAssessment) {
              const caResults = await prisma.teacherAssessmentResult.count({
                where: {
                  assessmentId: caAssessment.id,
                  score: { not: null }
                }
              });
              caSubmitted = caResults;
            }

            if (examAssessment) {
              const examResults = await prisma.teacherAssessmentResult.count({
                where: {
                  assessmentId: examAssessment.id,
                  score: { not: null }
                }
              });
              examSubmitted = examResults;
            }

            const completeness = Math.min(
              100,
              Math.round(((caSubmitted + examSubmitted) / (studentsInClass * 2)) * 100)
            );

            inboxItems.push({
              classId: cls.id,
              className: cls.name,
              subjectId: classSubject.subjectId,
              subjectName: classSubject.subject.name,
              teacherId: teacherSubject.staffId,
              teacherName: `${teacherSubject.staff.firstName} ${teacherSubject.staff.lastName}`,
              caStatus: caAssessment?.submittedAt ? 'SUBMITTED' : 'DRAFT',
              examStatus: examAssessment?.submittedAt ? 'SUBMITTED' : 'DRAFT',
              completenessIndicator: completeness,
              lastUpdated: new Date()
            });
          }
        }
      }

      return inboxItems;
    } catch (error) {
      console.error('Error getting results inbox:', error);
      throw error;
    }
  }

  /**
   * Step 3: DoS Approval & Freeze
   */
  async approveSubjectResults(
    dosUserId: string,
    classId: string,
    subjectId: string,
    caApproved: boolean,
    examApproved: boolean,
    lockSubject: boolean
  ): Promise<DosApproval> {
    try {
      // Create or update approval record
      const approval = await prisma.dosApproval.upsert({
        where: {
          classId_subjectId: {
            classId,
            subjectId
          }
        },
        update: {
          caApproved,
          examApproved,
          locked: lockSubject,
          lockedBy: dosUserId,
          lockedAt: lockSubject ? new Date() : undefined,
          updatedAt: new Date()
        },
        create: {
          classId,
          subjectId,
          caApproved,
          examApproved,
          locked: lockSubject,
          lockedBy: dosUserId,
          lockedAt: lockSubject ? new Date() : undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // If locking, also lock the underlying assessments
      if (lockSubject) {
        await prisma.teacherAssessment.updateMany({
          where: {
            classId,
            subjectId,
            OR: [
              { assessmentType: 'ASSIGNMENT' }, // CA
              { assessmentType: 'EXAM' }
            ]
          },
          data: {
            isLocked: true
          }
        });
      }

      return {
        id: approval.id,
        subjectId: approval.subjectId,
        classId: approval.classId,
        teacherId: '', // Would need to be populated differently
        caApproved: approval.caApproved,
        examApproved: approval.examApproved,
        locked: approval.locked,
        lockedBy: approval.lockedBy,
        lockedAt: approval.lockedAt!,
        auditTrail: [], // Would need to implement audit trail separately
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt
      };
    } catch (error) {
      console.error('Error approving subject results:', error);
      throw error;
    }
  }

  /**
   * Step 4: Report Card Compilation Engine
   */
  async compileReportCards(termId: string): Promise<StudentReportCard[]> {
    try {
      // Get all students in the school for this term
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: {
          academicYear: true
        }
      });

      if (!term) {
        throw new Error('Term not found');
      }

      const students = await prisma.student.findMany({
        where: {
          class: {
            term: {
              some: {
                id: termId
              }
            }
          }
        },
        include: {
          class: true,
          marks: {
            include: {
              subject: true
            }
          }
        }
      });

      const reportCards: StudentReportCard[] = [];

      for (const student of students) {
        // Get all subjects for this student's class
        const classSubjects = await prisma.classSubject.findMany({
          where: { classId: student.classId },
          include: { subject: true }
        });

        const subjectResults: SubjectResult[] = [];

        for (const classSubject of classSubjects) {
          // Get CA and Exam results for this subject using the DoS models
          const caResults = await prisma.dosContinuousAssessment.findMany({
            where: {
              studentId: student.id,
              assessmentPlan: {
                curriculumSubject: {
                  subjectId: classSubject.subjectId,
                  classId: student.classId
                }
              }
            }
          });

          const examResults = await prisma.dosExamResult.findMany({
            where: {
              studentId: student.id,
              exam: {
                curriculumSubject: {
                  subjectId: classSubject.subjectId,
                  classId: student.classId
                }
              }
            }
          });

          // Calculate CA score (average of all CA assessments, max 20)
          let caScore: number | null = null;
          if (caResults.length > 0) {
            const totalCaScore = caResults.reduce((sum, result) => sum + (result.score || 0), 0);
            caScore = Math.min(20, totalCaScore / caResults.length); // Cap at 20
          }

          // Calculate Exam score (average of all exam assessments, max 80)
          let examScore: number | null = null;
          if (examResults.length > 0) {
            const totalExamScore = examResults.reduce((sum, result) => sum + (result.score || 0), 0);
            examScore = Math.min(80, totalExamScore / examResults.length); // Cap at 80
          }

          // Calculate final score (CA + Exam, max 100)
          let finalScore: number | null = null;
          if (caScore !== null && examScore !== null) {
            finalScore = Math.round(caScore + examScore);
          } else if (caScore !== null) {
            finalScore = Math.round(caScore);
          } else if (examScore !== null) {
            finalScore = Math.round(examScore);
          }

          // Determine if this subject is approved and locked using DoSFinalScore
          const finalScoreRecord = await prisma.dosFinalScore.findFirst({
            where: {
              studentId: student.id,
              curriculumSubject: {
                subjectId: classSubject.subjectId,
                classId: student.classId
              },
              termId,
              isLocked: true
            }
          });

          const isApprovedAndLocked = !!finalScoreRecord && finalScoreRecord.isLocked;

          // Determine grade based on final score
          let grade: string | null = null;
          let gradeDescriptor: string | null = null;

          if (finalScore !== null) {
            if (finalScore >= 80) {
              grade = 'A';
              gradeDescriptor = 'DISTINCTION';
            } else if (finalScore >= 70) {
              grade = 'B';
              gradeDescriptor = 'CREDIT';
            } else if (finalScore >= 50) {
              grade = 'C';
              gradeDescriptor = 'PASS';
            } else {
              grade = 'F';
              gradeDescriptor = 'FAIL';
            }
          }

          subjectResults.push({
            subjectId: classSubject.subjectId,
            subjectName: classSubject.subject.name,
            subjectCode: classSubject.subject.code,
            caScore,
            examScore,
            finalScore,
            grade,
            gradeDescriptor,
            teacherRemarks: null, // Would come from teacher assessment results
            dosRemarks: null, // Would be added by DoS later
            approved: isApprovedAndLocked,
            locked: isApprovedAndLocked
          });
        }

        // Calculate overall average
        const validScores = subjectResults.filter(sr => sr.finalScore !== null).map(sr => sr.finalScore!) as number[];
        const overallAverage = validScores.length > 0
          ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
          : null;

        // Determine overall grade
        let overallGrade: string | null = null;
        if (overallAverage !== null) {
          if (overallAverage >= 80) {
            overallGrade = 'A';
          } else if (overallAverage >= 70) {
            overallGrade = 'B';
          } else if (overallAverage >= 50) {
            overallGrade = 'C';
          } else {
            overallGrade = 'F';
          }
        }

        // Check if any subject is missing (not approved/locked)
        const hasIncompleteSubjects = subjectResults.some(sr => !sr.approved);

        reportCards.push({
          id: `${student.id}_${termId}`, // Composite ID
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          classId: student.classId,
          className: student.class.name,
          termId,
          termName: term.name,
          academicYear: term.academicYear.name,
          subjectResults,
          overallAverage,
          overallGrade,
          position: null, // Would be calculated separately
          totalStudents: null, // Would be calculated separately
          classTeacherRemarks: null,
          dosRemarks: null,
          state: hasIncompleteSubjects ? ReportCardState.DRAFT : ReportCardState.REVIEWED,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      return reportCards;
    } catch (error) {
      console.error('Error compiling report cards:', error);
      throw error;
    }
  }

  /**
   * Step 4a: Approve Report Cards (DoS Review)
   */
  async approveReportCards(dosUserId: string, reportCardIds: string[]): Promise<boolean> {
    try {
      await prisma.newCurriculumReportCard.updateMany({
        where: {
          id: { in: reportCardIds }
        },
        data: {
          status: 'APPROVED', // Assuming this maps to APPROVED state
          dosApproved: true,
          dosApprovedBy: dosUserId,
          dosApprovedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error approving report cards:', error);
      throw error;
    }
  }

  /**
   * Step 4b: Publish Report Cards (Make available for SMS/link)
   */
  async publishReportCards(dosUserId: string, reportCardIds: string[]): Promise<boolean> {
    try {
      // Update report cards to published state
      await prisma.newCurriculumReportCard.updateMany({
        where: {
          id: { in: reportCardIds }
        },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedBy: dosUserId,
          updatedAt: new Date()
        }
      });

      // Generate secure links for each published report card
      for (const reportCardId of reportCardIds) {
        // Get student info for the report card
        const reportCard = await prisma.newCurriculumReportCard.findUnique({
          where: { id: reportCardId },
          include: {
            student: true,
            term: true
          }
        });

        if (reportCard) {
          // Generate a secure random token
          const crypto = await import('crypto');
          const token = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12-character token

          // Create secure link
          await prisma.secureLink.create({
            data: {
              token,
              guardianId: reportCard.student.id, // Using student ID as guardian ID for simplicity
              resourceType: 'REPORT_CARD',
              resourceId: reportCardId,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              createdAt: new Date()
            }
          });

          // Update the report card with the link token
          await prisma.newCurriculumReportCard.update({
            where: { id: reportCardId },
            data: {
              // Update with the token in a custom field if needed
            }
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error publishing report cards:', error);
      throw error;
    }
  }

  /**
   * Step 5: SMS Preview Generation
   */
  async generateSmsPreview(reportCard: StudentReportCard, smsMode: SmsMode, customComment?: string): Promise<SmsPreview> {
    // Format subject scores with abbreviations
    const subjectAbbreviations: { [key: string]: string } = {
      'Mathematics': 'Math',
      'English': 'Eng',
      'Biology': 'Bio',
      'Chemistry': 'Chem',
      'Physics': 'Phy',
      'Geography': 'Geo',
      'History': 'Hist',
      'Agriculture': 'Agric',
      'Computer Studies': 'Comp',
      'Commerce': 'Comm',
      'Literature': 'Lit',
      'Religious Education': 'RE',
      'French': 'Fr',
      'German': 'Ger',
      'Music': 'Mus',
      'Art': 'Art',
      'Physical Education': 'PE',
    };

    // Format subject results for SMS
    const subjectStrings = reportCard.subjectResults
      .filter(sr => sr.finalScore !== null) // Only include subjects with scores
      .map(sr => {
        const abbr = subjectAbbreviations[sr.subjectName] || sr.subjectName.substring(0, 4);
        return `${abbr} ${sr.finalScore}`;
      })
      .join(', ');

    // Generate comment based on mode and custom input
    let comment = '';
    if (customComment) {
      comment = customComment;
    } else {
      // Generate a default comment based on performance
      if (reportCard.overallAverage && reportCard.overallAverage >= 80) {
        comment = 'Excellent work!';
      } else if (reportCard.overallAverage && reportCard.overallAverage >= 70) {
        comment = 'Good progress.';
      } else if (reportCard.overallAverage && reportCard.overallAverage >= 50) {
        comment = 'Steady progress. Keep improving.';
      } else {
        comment = 'Needs improvement.';
      }
    }

    // Generate SMS based on mode
    let segment1 = '';
    let segment2 = '';

    switch (smsMode) {
      case SmsMode.STANDARD:
        segment1 = `[${reportCard.className}] T${reportCard.termName.split(' ')[1] || '1'} Results: ${reportCard.studentName} (${reportCard.className})\n${subjectStrings}\nOverall Avg: ${reportCard.overallAverage || 'N/A'}%`;
        segment2 = `Comment: ${comment}\nFull Report: https://so.ug/r/${this.generateSecureToken()}`;
        break;

      case SmsMode.SIMPLE:
        segment1 = `[${reportCard.className}] Results for ${reportCard.studentName} ${reportCard.className}.\nAverage: ${reportCard.overallAverage || 'N/A'}%.\nClick for full report: https://so.ug/r/${this.generateSecureToken()}`;
        break;

      case SmsMode.MINIMAL:
        segment1 = `[${reportCard.className}] ${reportCard.studentName} ${reportCard.className} results ready.\nAvg: ${reportCard.overallAverage || 'N/A'}%.\nVisit: https://so.ug/r/${this.generateSecureToken()}`;
        break;

      case SmsMode.NO_LINK:
        segment1 = `[${reportCard.className}] ${reportCard.studentName} ${reportCard.className} Avg ${reportCard.overallAverage || 'N/A'}%.\nPlease visit school for full report.`;
        break;
    }

    // Calculate character counts
    const totalChars = segment1.length + (segment2 ? segment2.length : 0);
    const segmentCount = segment2 ? 2 : 1;

    // Check if it exceeds SMS limits (306 for 2 segments)
    const isValid = totalChars <= 306;
    const operatorWarning = isValid ? undefined : 'Message exceeds 2-segment limit. May incur extra charges.';

    return {
      segment1,
      segment2,
      totalCharacters: totalChars,
      segmentCount,
      isValid,
      operatorWarning
    };
  }

  /**
   * Helper to generate secure tokens
   */
  private generateSecureToken(): string {
    const crypto = require('crypto') as typeof import('crypto');
    return crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 6);
  }

  /**
   * Step 6: Send SMS
   */
  async sendSms(request: SmsSendingRequest, dosUserId: string): Promise<SmsSendingResult> {
    try {
      // Get all students to send SMS to
      let students = [];
      
      if (request.classId) {
        // Get all students in the specified class
        students = await prisma.student.findMany({
          where: {
            classId: request.classId,
            id: { in: request.studentIds.length > 0 ? request.studentIds : undefined }
          },
          include: {
            studentGuardians: {
              include: {
                guardian: true
              }
            }
          }
        });
      } else {
        // Get specific students
        students = await prisma.student.findMany({
          where: {
            id: { in: request.studentIds }
          },
          include: {
            studentGuardians: {
              include: {
                guardian: true
              }
            }
          }
        });
      }

      const results: SmsSendingResult = {
        success: true,
        messageCount: 0,
        sentCount: 0,
        failedCount: 0,
        results: []
      };

      // Compile report cards for these students if not already done
      // This is simplified - in reality, you'd want to compile only for students that need it
      const reportCards = await this.compileReportCards(''); // Need term ID

      for (const student of students) {
        // Find the report card for this student
        const reportCard = reportCards.find(rc => rc.studentId === student.id);
        
        if (!reportCard) {
          results.failedCount++;
          results.results.push({
            studentId: student.id,
            phoneNumber: '',
            smsSegments: [],
            status: 'FAILED',
            errorMessage: 'Report card not available'
          });
          continue;
        }

        // Generate SMS preview for this student
        const preview = await this.generateSmsPreview(reportCard, request.smsMode, request.customComment);

        // In a real implementation, you would send the SMS using your SMS provider
        // For now, we'll simulate the sending
        const smsSegments = [preview.segment1];
        if (preview.segment2) {
          smsSegments.push(preview.segment2);
        }

        // Get guardian phone number
        const guardian = student.studentGuardians[0]?.guardian;
        const phoneNumber = guardian?.phone || '';

        if (request.previewOnly) {
          // Just return the preview
          results.results.push({
            studentId: student.id,
            phoneNumber,
            smsSegments,
            status: 'QUEUED'
          });
        } else {
          // Actually send the SMS (simulated)
          // In real implementation: call your SMS service
          
          // For simulation purposes, assume all succeed
          results.sentCount++;
          results.results.push({
            studentId: student.id,
            phoneNumber,
            smsSegments,
            status: 'SENT'
          });
        }
      }

      results.messageCount = results.results.length;

      return results;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Step 7: DoS Dashboard Stats
   */
  async getDashboardStats(dosUserId: string): Promise<any> {
    try {
      // Get user's school
      const user = await prisma.user.findUnique({
        where: { id: dosUserId },
        include: { school: true }
      });

      if (!user || !user.schoolId) {
        throw new Error('User not associated with a school');
      }

      // Get all classes in the school
      const totalClasses = await prisma.class.count({
        where: { schoolId: user.schoolId }
      });

      // Get classes with all subjects approved and locked
      const completedClasses = await prisma.class.count({
        where: {
          schoolId: user.schoolId,
          classSubjects: {
            every: {
              dosCurriculumSubjects: {
                some: {
                  dosApproved: true
                }
              }
            }
          }
        }
      });

      // Get pending approvals
      const pendingApprovals = await prisma.teacherAssessment.count({
        where: {
          submittedAt: { not: null },
          isLocked: false
        }
      });

      // Get published reports
      const publishedReports = await prisma.newCurriculumReportCard.count({
        where: {
          publishedAt: { not: null }
        }
      });

      // Calculate overall completion
      const overallCompletion = totalClasses > 0
        ? Math.round((completedClasses / totalClasses) * 100)
        : 0;

      return {
        totalClasses,
        completedClasses,
        pendingApprovals,
        publishedReports,
        smsSentThisTerm: 0, // Would need to track this separately
        overallCompletion
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Step 8: PDF Generation Flow
   */
  async generateReportCardPdf(reportCardId: string): Promise<Buffer> {
    try {
      // Get the report card data
      const reportCard = await prisma.newCurriculumReportCard.findUnique({
        where: { id: reportCardId },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                include: {
                  guardian: true
                }
              }
            }
          },
          term: {
            include: {
              academicYear: true
            }
          },
          reportCardSubjects: {
            include: {
              subject: true,
              teacher: true
            }
          }
        }
      });

      if (!reportCard) {
        throw new Error('Report card not found');
      }

      // Convert to the format expected by the PDF service
      const pdfData = {
        student: {
          name: `${reportCard.student.firstName} ${reportCard.student.lastName}`,
          admissionNumber: reportCard.student.admissionNumber,
          class: reportCard.student.class.name,
          photo: reportCard.student.profilePicture
        },
        school: {
          name: reportCard.student.school?.name || 'School Name',
          address: reportCard.student.school?.address || 'School Address',
          logo: reportCard.student.school?.logo || undefined,
          motto: reportCard.student.school?.motto || undefined,
          website: reportCard.student.school?.website || undefined,
          phone: reportCard.student.school?.phone || undefined,
          email: reportCard.student.school?.email || undefined
        },
        term: {
          name: reportCard.term.name,
          academicYear: reportCard.term.academicYear.name,
          startDate: reportCard.term.startDate,
          endDate: reportCard.term.endDate
        },
        subjects: reportCard.reportCardSubjects.map(rcs => ({
          name: rcs.subject.name,
          competencies: [{
            topic: rcs.subject.name,
            competencyDescription: 'Overall subject competency',
            caScore: rcs.caScore || 0,
            examScore: rcs.examScore || 0,
            finalScore: rcs.finalScore || 0,
            level: this.getCompetencyLevelFromScore(rcs.finalScore || 0),
            descriptor: this.getDescriptorFromScore(rcs.finalScore || 0),
            genericSkills: rcs.remarks || undefined,
            remarks: rcs.remarks || undefined
          }],
          subjectSummary: {
            overallLevel: this.getCompetencyLevelFromScore(rcs.finalScore || 0),
            keyStrengths: [],
            areasForImprovement: [],
            caTotal: rcs.caScore || 0,
            examTotal: rcs.examScore || 0,
            finalTotal: rcs.finalScore || 0,
            subjectGrade: this.getGradeFromScore(rcs.finalScore || 0)
          },
          teacherName: `${rcs.teacher?.firstName || ''} ${rcs.teacher?.lastName || ''}`,
          teacherSignature: rcs.teacher?.signature || undefined
        })),
        skillsAndValues: {
          communication: {
            level: 'Proficient',
            remarks: 'Good communication skills'
          },
          collaboration: {
            level: 'Proficient',
            remarks: 'Works well in groups'
          },
          criticalThinking: {
            level: 'Developing',
            remarks: 'Shows analytical thinking'
          },
          responsibility: {
            level: 'Proficient',
            remarks: 'Demonstrates responsibility'
          }
        },
        attendance: {
          totalDays: reportCard.totalDays || 0,
          presentDays: reportCard.presentDays || 0,
          absentDays: (reportCard.totalDays || 0) - (reportCard.presentDays || 0),
          percentage: reportCard.attendancePercentage || 0
        },
        remarks: {
          subjectTeacherRemarks: reportCard.subjectTeacherRemarks || undefined,
          classTeacherRemarks: reportCard.classTeacherRemarks || undefined,
          dosAcademicRemarks: reportCard.dosRemarks || 'Satisfactory performance'
        },
        promotionDecision: {
          status: reportCard.promotionStatus as 'PROMOTED' | 'PROMOTED_ON_CONDITION' | 'RETAKE_REQUIRED' | 'REPEAT_ADVISED' || 'PROMOTED',
          justification: reportCard.promotionJustification || undefined,
          conditions: reportCard.promotionConditions || []
        },
        dosValidation: {
          dosName: 'Director of Studies',
          dosSignature: undefined,
          schoolStamp: undefined,
          reportVersion: '1.0',
          generationDate: new Date(),
          isWatermarked: true
        },
        overallSummary: {
          position: reportCard.position || undefined,
          totalStudents: reportCard.totalStudents || undefined,
          overallGrade: this.getGradeFromScore(reportCard.overallAverage || 0),
          overallLevel: this.getCompetencyLevelFromScore(reportCard.overallAverage || 0)
        }
      };

      // Generate the PDF using the PDF service
      const { generateNewCurriculumReportCard } = await import('./pdf-generation.service');
      return await generateNewCurriculumReportCard(pdfData);
    } catch (error) {
      console.error('Error generating report card PDF:', error);
      throw error;
    }
  }

  private getCompetencyLevelFromScore(score: number): 'Emerging' | 'Developing' | 'Proficient' | 'Advanced' {
    if (score >= 80) return 'Advanced';
    if (score >= 60) return 'Proficient';
    if (score >= 40) return 'Developing';
    return 'Emerging';
  }

  private getDescriptorFromScore(score: number): string {
    if (score >= 80) return 'Outstanding';
    if (score >= 70) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Satisfactory';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  private getGradeFromScore(score: number): string {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'F';
  }
}