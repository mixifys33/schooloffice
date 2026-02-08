// Note: jsPDF and date-fns need to be installed
// Run: npm install jspdf jspdf-autotable date-fns @types/jspdf

// Temporary mock imports until packages are installed
// const jsPDF = typeof window !== 'undefined' ? require('jspdf')?.jsPDF : null;
// const format = (date: Date, formatStr: string) => date.toLocaleDateString();

// Enhanced New Curriculum Report Card Data Structure
interface NewCurriculumReportCardData {
  // Learner Information
  student: {
    name: string;
    admissionNumber: string;
    class: string;
    stream?: string;
    house?: string;
    photo?: string; // Base64 or URL
  };
  
  // School Information
  school: {
    name: string;
    address: string;
    logo?: string; // Base64 or URL
    motto?: string;
    website?: string;
    phone?: string;
    email?: string;
  };
  
  // Term Information
  term: {
    name: string;
    academicYear: string;
    startDate: Date;
    endDate: Date;
  };
  
  // Subject Competency Assessment (New Curriculum Structure)
  subjects: Array<{
    name: string;
    competencies: Array<{
      topic: string;
      competencyDescription: string;
      caScore: number; // Continuous Assessment (20%)
      examScore: number; // Exam (80%)
      finalScore: number; // Total (100%)
      level: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
      descriptor: string; // Outstanding, Moderate, etc.
      genericSkills?: string;
      remarks?: string;
    }>;
    subjectSummary: {
      overallLevel: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
      keyStrengths: string[];
      areasForImprovement: string[];
      caTotal: number; // Total CA score (20%)
      examTotal: number; // Total Exam score (80%)
      finalTotal: number; // Final subject score (100%)
      subjectGrade: string;
    };
    teacherName?: string;
    teacherSignature?: string;
  }>;
  
  // Skills & Values Assessment (Mandatory)
  skillsAndValues: {
    communication: {
      level: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
      remarks?: string;
    };
    collaboration: {
      level: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
      remarks?: string;
    };
    criticalThinking: {
      level: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
      remarks?: string;
    };
    responsibility: {
      level: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
      remarks?: string;
    };
  };
  
  // Attendance Summary
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    percentage: number;
  };
  
  // Remarks Section
  remarks: {
    subjectTeacherRemarks?: string;
    classTeacherRemarks?: string;
    dosAcademicRemarks: string; // Mandatory
  };
  
  // Promotion & Transition Decision (Critical)
  promotionDecision: {
    status: 'PROMOTED' | 'PROMOTED_ON_CONDITION' | 'RETAKE_REQUIRED' | 'REPEAT_ADVISED';
    justification?: string;
    conditions?: string[];
  };
  
  // Official Validation (DoS Authority)
  dosValidation: {
    dosName: string;
    dosSignature?: string; // Base64 or URL
    schoolStamp?: string; // Base64 or URL
    reportVersion: string;
    generationDate: Date;
    isWatermarked: boolean;
  };
  
  // Overall Summary
  overallSummary: {
    position?: number;
    totalStudents?: number;
    overallGrade?: string;
    overallLevel: 'Emerging' | 'Developing' | 'Proficient' | 'Advanced';
  };
}

// Customizable Report Card Template Configuration
interface ReportCardTemplate {
  id: string;
  name: string;
  schoolId: string;
  
  // Layout Configuration
  layout: {
    pageSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      text: string;
    };
    fonts: {
      header: string;
      body: string;
      size: {
        header: number;
        subheader: number;
        body: number;
        small: number;
      };
    };
  };
  
  // Field Configuration (Customizable by DoS)
  fields: {
    // Header Section
    showSchoolLogo: boolean;
    showSchoolMotto: boolean;
    showStudentPhoto: boolean;
    headerFields: string[]; // Configurable order
    
    // Student Information
    studentInfoFields: string[]; // name, admissionNumber, class, stream, house
    
    // Subject Assessment
    subjectTableColumns: string[]; // topic, caScore, examScore, finalScore, level, descriptor, etc.
    showCompetencyDetails: boolean;
    showSubjectSummary: boolean;
    
    // Skills & Values
    showSkillsSection: boolean;
    skillsFields: string[]; // communication, collaboration, criticalThinking, responsibility
    
    // Attendance
    showAttendanceSection: boolean;
    attendanceFormat: 'detailed' | 'summary';
    
    // Remarks
    remarksFields: string[]; // subjectTeacher, classTeacher, dos
    
    // Promotion Decision
    showPromotionDecision: boolean;
    promotionFormat: 'detailed' | 'simple';
    
    // DoS Validation
    showDosSignature: boolean;
    showSchoolStamp: boolean;
    showWatermark: boolean;
    
    // Footer
    footerFields: string[]; // generationDate, reportVersion, pageNumber
  };
  
  // Competency Level Definitions (Customizable)
  competencyLevels: {
    emerging: {
      label: string;
      description: string;
      color: string;
      scoreRange: { min: number; max: number };
    };
    developing: {
      label: string;
      description: string;
      color: string;
      scoreRange: { min: number; max: number };
    };
    proficient: {
      label: string;
      description: string;
      color: string;
      scoreRange: { min: number; max: number };
    };
    advanced: {
      label: string;
      description: string;
      color: string;
      scoreRange: { min: number; max: number };
    };
  };
  
  // Custom Text/Labels (Multilingual Support)
  labels: {
    [key: string]: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDefault: boolean;
  isActive: boolean;
}

// Template Field Configuration for Drag & Drop Editor
interface TemplateField {
  id: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'image' | 'table' | 'signature';
  label: string;
  required: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  options?: string[];
  defaultValue?: string | number | boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  style?: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    border?: boolean;
  };
}

interface TemplateSection {
  id: string;
  name: string;
  type: 'header' | 'student_info' | 'subjects' | 'skills' | 'remarks' | 'promotion' | 'validation';
  visible: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fields: TemplateField[];
  customizable: boolean;
}

// Legacy Report Card Data (for backward compatibility)
interface ReportCardData {
  student: {
    name: string;
    admissionNumber: string;
    class: string;
    section?: string;
  };
  school: {
    name: string;
    address: string;
    logo?: string;
  };
  term: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  subjects: Array<{
    name: string;
    totalMarks: number;
    obtainedMarks: number;
    grade: string;
    remarks?: string;
  }>;
  attendance: {
    totalDays: number;
    presentDays: number;
    percentage: number;
  };
  overallGrade: string;
  position: number;
  totalStudents: number;
  remarks?: string;
}

interface ExamTimetableData {
  school: {
    name: string;
    address: string;
    logo?: string;
  };
  exam: {
    title: string;
    type: string;
    startDate: Date;
    endDate: Date;
  };
  class: {
    name: string;
    section?: string;
  };
  schedule: Array<{
    date: Date;
    time: string;
    subject: string;
    duration: number;
    totalMarks: number;
    venue?: string;
  }>;
}

interface AssessmentReportData {
  assessment: {
    title: string;
    type: string;
    date: Date;
    totalMarks: number;
  };
  class: {
    name: string;
    section?: string;
  };
  results: Array<{
    studentName: string;
    admissionNumber: string;
    marksObtained: number;
    grade: string;
    percentage: number;
  }>;
  statistics: {
    highest: number;
    lowest: number;
    average: number;
    passPercentage: number;
  };
}

class PDFGenerationService {
  // Default template for new curriculum report cards
  getDefaultReportCardTemplate(): ReportCardTemplate {
    return {
      id: 'default-new-curriculum',
      name: 'New Curriculum Report Card',
      schoolId: 'default',
      layout: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        colors: {
          primary: 'var(--accent-hover)',
          secondary: 'var(--text-muted)',
          accent: 'var(--chart-green)',
          text: '#1f2937'
        },
        fonts: {
          header: 'helvetica',
          body: 'helvetica',
          size: {
            header: 18,
            subheader: 14,
            body: 10,
            small: 8
          }
        }
      },
      fields: {
        showSchoolLogo: true,
        showSchoolMotto: true,
        showStudentPhoto: true,
        headerFields: ['schoolName', 'schoolAddress', 'reportTitle'],
        studentInfoFields: ['name', 'admissionNumber', 'class', 'stream', 'house'],
        subjectTableColumns: ['topic', 'caScore', 'examScore', 'finalScore', 'level', 'descriptor', 'genericSkills', 'remarks'],
        showCompetencyDetails: true,
        showSubjectSummary: true,
        showSkillsSection: true,
        skillsFields: ['communication', 'collaboration', 'criticalThinking', 'responsibility'],
        showAttendanceSection: true,
        attendanceFormat: 'detailed',
        remarksFields: ['subjectTeacher', 'classTeacher', 'dos'],
        showPromotionDecision: true,
        promotionFormat: 'detailed',
        showDosSignature: true,
        showSchoolStamp: true,
        showWatermark: true,
        footerFields: ['generationDate', 'reportVersion', 'pageNumber']
      },
      competencyLevels: {
        emerging: {
          label: 'Emerging',
          description: 'Beginning to show understanding',
          color: 'var(--chart-red)',
          scoreRange: { min: 0, max: 39 }
        },
        developing: {
          label: 'Developing',
          description: 'Progressing towards expectations',
          color: 'var(--chart-yellow)',
          scoreRange: { min: 40, max: 59 }
        },
        proficient: {
          label: 'Proficient',
          description: 'Meeting expectations',
          color: 'var(--chart-green)',
          scoreRange: { min: 60, max: 79 }
        },
        advanced: {
          label: 'Advanced',
          description: 'Exceeding expectations',
          color: 'var(--chart-blue)',
          scoreRange: { min: 80, max: 100 }
        }
      },
      labels: {
        reportTitle: "LEARNER'S END OF TERM REPORT CARD",
        studentInfo: 'LEARNER INFORMATION',
        subjectAssessment: 'SUBJECT COMPETENCY ASSESSMENT',
        skillsValues: 'SKILLS & VALUES ASSESSMENT',
        attendance: 'ATTENDANCE SUMMARY',
        remarks: 'REMARKS',
        promotionDecision: 'PROMOTION & TRANSITION DECISION',
        dosValidation: 'DIRECTOR OF STUDIES VALIDATION',
        caLabel: 'CA (20%)',
        examLabel: 'Exam (80%)',
        finalLabel: 'Final /100',
        levelLabel: 'Level',
        descriptorLabel: 'Descriptor'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      isDefault: true,
      isActive: true
    };
  }

  // NEW CURRICULUM REPORT CARD GENERATION
  async generateNewCurriculumReportCard(
    data: NewCurriculumReportCardData,
    customTemplate?: Partial<ReportCardTemplate>
  ): Promise<Buffer> {
    // For now, return a mock buffer until jsPDF is installed
    const mockPdfContent = `
      Report Card for ${data.student.name}
      Class: ${data.student.class}
      Term: ${data.term.name}
      
      This is a placeholder until jsPDF is properly installed.
      Please run: npm install jspdf jspdf-autotable date-fns @types/jspdf
    `;
    
    // Use customTemplate if provided (prevents unused parameter warning)
    if (customTemplate) {
      // Template customization logic would go here
    }
    
    return Buffer.from(mockPdfContent, 'utf-8');
  }

  // TEMPLATE MANAGEMENT METHODS
  createCustomTemplate(templateData: Partial<ReportCardTemplate>): ReportCardTemplate {
    const defaultTemplate = this.getDefaultReportCardTemplate();
    return {
      ...defaultTemplate,
      ...templateData,
      id: templateData.id || `custom-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false
    };
  }

  resetTemplateToDefault(): ReportCardTemplate {
    return this.getDefaultReportCardTemplate();
  }

  validateTemplate(template: ReportCardTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.schoolId) errors.push('School ID is required');
    
    // Validate layout
    if (!template.layout.pageSize || !['A4', 'Letter'].includes(template.layout.pageSize)) {
      errors.push('Invalid page size');
    }
    
    if (!template.layout.orientation || !['portrait', 'landscape'].includes(template.layout.orientation)) {
      errors.push('Invalid orientation');
    }
    
    // Validate competency levels
    const requiredLevels = ['emerging', 'developing', 'proficient', 'advanced'];
    for (const level of requiredLevels) {
      if (!template.competencyLevels[level as keyof typeof template.competencyLevels]) {
        errors.push(`Missing competency level: ${level}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // UTILITY METHODS
  private determineCompetencyLevel(score: number, template: ReportCardTemplate): string {
    const levels = template.competencyLevels;
    
    if (score >= levels.advanced.scoreRange.min) return 'Advanced';
    if (score >= levels.proficient.scoreRange.min) return 'Proficient';
    if (score >= levels.developing.scoreRange.min) return 'Developing';
    return 'Emerging';
  }

  private getCompetencyColor(level: string, template: ReportCardTemplate): string {
    const levelKey = level.toLowerCase() as keyof typeof template.competencyLevels;
    return template.competencyLevels[levelKey]?.color || '#6b7280';
  }

  // LEGACY REPORT CARD GENERATION (for backward compatibility)
  generateReportCard(data: ReportCardData): Promise<Blob> {
    return new Promise((resolve) => {
      // Mock implementation until jsPDF is installed
      const mockContent = `Legacy Report Card for ${data.student.name}`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      resolve(blob);
    });
  }

  generateExamTimetable(data: ExamTimetableData): Promise<Blob> {
    return new Promise((resolve) => {
      // Mock implementation until jsPDF is installed
      const mockContent = `Exam Timetable for ${data.exam.title}`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      resolve(blob);
    });
  }

  generateAssessmentReport(data: AssessmentReportData): Promise<Blob> {
    return new Promise((resolve) => {
      // Mock implementation until jsPDF is installed
      const mockContent = `Assessment Report for ${data.assessment.title}`;
      const blob = new Blob([mockContent], { type: 'application/pdf' });
      resolve(blob);
    });
  }

  async downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // TIMETABLE PDF GENERATION METHODS
  async generateTimetablePDFs(data: TimetablePDFData): Promise<{
    masterTimetable: Buffer;
    classTimetables: Array<{ className: string; pdf: Buffer }>;
    teacherTimetables: Array<{ teacherName: string; pdf: Buffer }>;
  }> {
    // For now, return mock buffers until jsPDF is installed
    const masterContent = this.generateMasterTimetableHTML(data);
    const masterPdf = Buffer.from(masterContent, 'utf-8');

    // Generate class timetables
    const classTimetables: Array<{ className: string; pdf: Buffer }> = [];
    const classes = this.getUniqueClasses(data.slots);
    
    for (const className of classes) {
      const classSlots = data.slots.filter(slot => slot.className === className);
      const classData: ClassTimetablePDFData = {
        ...data,
        class: {
          id: classSlots[0]?.classId || '',
          name: className,
          stream: undefined
        },
        classSlots
      };
      
      const classContent = this.generateClassTimetableHTML(classData);
      const classPdf = Buffer.from(classContent, 'utf-8');
      classTimetables.push({ className, pdf: classPdf });
    }

    // Generate teacher timetables
    const teacherTimetables: Array<{ teacherName: string; pdf: Buffer }> = [];
    const teachers = this.getUniqueTeachers(data.slots);
    
    for (const teacher of teachers) {
      const teacherSlots = data.slots.filter(slot => slot.teacherId === teacher.id);
      const workloadSummary = this.calculateWorkloadSummary(teacherSlots);
      
      const teacherData: TeacherTimetablePDFData = {
        ...data,
        teacher: {
          id: teacher.id,
          firstName: teacher.name.split(' ')[0] || '',
          lastName: teacher.name.split(' ').slice(1).join(' ') || '',
          employeeNumber: undefined,
          subjects: Array.from(new Set(teacherSlots.map(slot => slot.subjectName)))
        },
        teacherSlots,
        workloadSummary
      };
      
      const teacherContent = this.generateTeacherTimetableHTML(teacherData);
      const teacherPdf = Buffer.from(teacherContent, 'utf-8');
      teacherTimetables.push({ teacherName: teacher.name, pdf: teacherPdf });
    }

    return {
      masterTimetable: masterPdf,
      classTimetables,
      teacherTimetables
    };
  }

  // HTML GENERATION FOR TIMETABLES
  private generateMasterTimetableHTML(data: TimetablePDFData): string {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const periods = Array.from({ length: data.timeStructure.periodsPerDay }, (_, i) => i + 1);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Master Timetable - ${data.school.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .school-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .term-info { font-size: 16px; color: #666; }
        .timetable { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .timetable th, .timetable td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        .timetable th { background-color: #f5f5f5; font-weight: bold; }
        .period-header { background-color: #e8f4f8; }
        .break-slot { background-color: #fff3cd; font-style: italic; }
        .subject-slot { background-color: #d4edda; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="school-name">${data.school.name}</div>
        <div class="term-info">Master Timetable - ${data.term.name}</div>
        <div class="term-info">${data.term.startDate} to ${data.term.endDate}</div>
      </div>
      
      <table class="timetable">
        <thead>
          <tr>
            <th>Period</th>
            <th>Time</th>
            ${days.map(day => `<th>${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${periods.map(period => {
            const periodSlots = data.slots.filter(slot => slot.period === period);
            const timeSlot = periodSlots[0];
            
            return `
              <tr>
                <td class="period-header">P${period}</td>
                <td class="period-header">${timeSlot ? this.formatTimeRange(timeSlot.startTime, timeSlot.endTime) : ''}</td>
                ${days.map(day => {
                  const daySlots = periodSlots.filter(slot => slot.day === day);
                  if (daySlots.length === 0) {
                    return '<td>-</td>';
                  }
                  
                  return `<td class="${daySlots[0].isBreak ? 'break-slot' : 'subject-slot'}">
                    ${daySlots.map(slot => 
                      slot.isBreak ? 'BREAK' : 
                      `${slot.subjectName}<br><small>${slot.className} - ${slot.teacherName}</small>`
                    ).join('<br>')}
                  </td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated on ${new Date(data.generatedAt).toLocaleString()} by ${data.generatedBy.name}</p>
        <p>Total Classes: ${this.getUniqueClasses(data.slots).length} | Total Teachers: ${this.getUniqueTeachers(data.slots).length}</p>
      </div>
    </body>
    </html>
    `;
  }

  private generateClassTimetableHTML(data: ClassTimetablePDFData): string {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const periods = Array.from({ length: data.timeStructure.periodsPerDay }, (_, i) => i + 1);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Class Timetable - ${data.class.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .school-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .class-name { font-size: 18px; color: var(--accent-hover); margin-bottom: 10px; }
        .term-info { font-size: 14px; color: #666; }
        .timetable { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .timetable th, .timetable td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        .timetable th { background-color: #f5f5f5; font-weight: bold; }
        .period-header { background-color: #e8f4f8; }
        .break-slot { background-color: #fff3cd; font-style: italic; }
        .subject-slot { background-color: #d4edda; }
        .empty-slot { background-color: #f8f9fa; color: #6c757d; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="school-name">${data.school.name}</div>
        <div class="class-name">Class ${data.class.name} Timetable</div>
        <div class="term-info">${data.term.name} (${data.term.startDate} to ${data.term.endDate})</div>
      </div>
      
      <table class="timetable">
        <thead>
          <tr>
            <th>Period</th>
            <th>Time</th>
            ${days.map(day => `<th>${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${periods.map(period => {
            const periodSlots = data.classSlots.filter(slot => slot.period === period);
            const timeSlot = periodSlots[0];
            
            return `
              <tr>
                <td class="period-header">P${period}</td>
                <td class="period-header">${timeSlot ? this.formatTimeRange(timeSlot.startTime, timeSlot.endTime) : ''}</td>
                ${days.map(day => {
                  const daySlot = periodSlots.find(slot => slot.day === day);
                  
                  if (!daySlot) {
                    return '<td class="empty-slot">Free</td>';
                  }
                  
                  if (daySlot.isBreak) {
                    return '<td class="break-slot">BREAK</td>';
                  }
                  
                  return `<td class="subject-slot">
                    <strong>${daySlot.subjectName}</strong><br>
                    <small>${daySlot.teacherName}</small>
                    ${daySlot.roomName ? `<br><small>Room: ${daySlot.roomName}</small>` : ''}
                  </td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated on ${new Date(data.generatedAt).toLocaleString()} by ${data.generatedBy.name}</p>
      </div>
    </body>
    </html>
    `;
  }

  private generateTeacherTimetableHTML(data: TeacherTimetablePDFData): string {
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const periods = Array.from({ length: data.timeStructure.periodsPerDay }, (_, i) => i + 1);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Teacher Timetable - ${data.teacher.firstName} ${data.teacher.lastName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .school-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .teacher-name { font-size: 18px; color: var(--accent-hover); margin-bottom: 10px; }
        .term-info { font-size: 14px; color: #666; }
        .timetable { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .timetable th, .timetable td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        .timetable th { background-color: #f5f5f5; font-weight: bold; }
        .period-header { background-color: #e8f4f8; }
        .break-slot { background-color: #fff3cd; font-style: italic; }
        .subject-slot { background-color: #d4edda; }
        .free-slot { background-color: #f8f9fa; color: #6c757d; }
        .workload-summary { margin-top: 30px; }
        .workload-table { width: 100%; border-collapse: collapse; }
        .workload-table th, .workload-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .workload-table th { background-color: #f5f5f5; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="school-name">${data.school.name}</div>
        <div class="teacher-name">${data.teacher.firstName} ${data.teacher.lastName}</div>
        ${data.teacher.employeeNumber ? `<div class="term-info">Employee #: ${data.teacher.employeeNumber}</div>` : ''}
        <div class="term-info">${data.term.name} (${data.term.startDate} to ${data.term.endDate})</div>
      </div>
      
      <table class="timetable">
        <thead>
          <tr>
            <th>Period</th>
            <th>Time</th>
            ${days.map(day => `<th>${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${periods.map(period => {
            const periodSlots = data.teacherSlots.filter(slot => slot.period === period);
            const timeSlot = periodSlots[0];
            
            return `
              <tr>
                <td class="period-header">P${period}</td>
                <td class="period-header">${timeSlot ? this.formatTimeRange(timeSlot.startTime, timeSlot.endTime) : ''}</td>
                ${days.map(day => {
                  const daySlot = periodSlots.find(slot => slot.day === day);
                  
                  if (!daySlot) {
                    return '<td class="free-slot">Free</td>';
                  }
                  
                  if (daySlot.isBreak) {
                    return '<td class="break-slot">BREAK</td>';
                  }
                  
                  return `<td class="subject-slot">
                    <strong>${daySlot.subjectName}</strong><br>
                    <small>${daySlot.className}</small>
                    ${daySlot.roomName ? `<br><small>Room: ${daySlot.roomName}</small>` : ''}
                  </td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="workload-summary">
        <h3>Workload Summary</h3>
        <table class="workload-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Periods per Week</th>
              <th>Classes</th>
            </tr>
          </thead>
          <tbody>
            ${data.workloadSummary.subjectDistribution.map(subject => `
              <tr>
                <td>${subject.subjectName}</td>
                <td>${subject.periods}</td>
                <td>${subject.classes.join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p><strong>Total Periods per Week:</strong> ${data.workloadSummary.totalPeriods}</p>
      </div>
      
      <div class="footer">
        <p>Generated on ${new Date(data.generatedAt).toLocaleString()} by ${data.generatedBy.name}</p>
      </div>
    </body>
    </html>
    `;
  }

  // UTILITY METHODS FOR TIMETABLE PDF GENERATION
  private formatTimeRange(startTime: string, endTime: string): string {
    return `${startTime}-${endTime}`;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getUniqueClasses(slots: TimetablePDFData['slots']): string[] {
    return Array.from(new Set(slots.map(slot => slot.className))).sort();
  }

  private getUniqueTeachers(slots: TimetablePDFData['slots']): Array<{ id: string; name: string }> {
    const teacherMap = new Map<string, { id: string; name: string }>();
    
    slots.forEach(slot => {
      if (!slot.isBreak && !teacherMap.has(slot.teacherId)) {
        teacherMap.set(slot.teacherId, {
          id: slot.teacherId,
          name: slot.teacherName
        });
      }
    });
    
    return Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private calculateWorkloadSummary(teacherSlots: TimetablePDFData['slots']): TeacherTimetablePDFData['workloadSummary'] {
    const subjectMap = new Map<string, { periods: number; classes: Set<string> }>();
    const periodsPerDay = [0, 0, 0, 0, 0]; // Mon-Fri
    const dayIndex = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4 };
    
    teacherSlots.forEach(slot => {
      if (!slot.isBreak) {
        // Count subject periods
        if (!subjectMap.has(slot.subjectName)) {
          subjectMap.set(slot.subjectName, { periods: 0, classes: new Set() });
        }
        const subject = subjectMap.get(slot.subjectName)!;
        subject.periods++;
        subject.classes.add(slot.className);
        
        // Count periods per day
        periodsPerDay[dayIndex[slot.day as keyof typeof dayIndex]]++;
      }
    });
    
    const subjectDistribution = Array.from(subjectMap.entries()).map(([subjectName, data]) => ({
      subjectName,
      periods: data.periods,
      classes: Array.from(data.classes).sort()
    }));
    
    return {
      totalPeriods: teacherSlots.filter(slot => !slot.isBreak).length,
      periodsPerDay,
      subjectDistribution
    };
  }
}

// Export functions for use in API routes
export const generateNewCurriculumReportCard = async (data: NewCurriculumReportCardData): Promise<Buffer> => {
  const service = new PDFGenerationService();
  return service.generateNewCurriculumReportCard(data);
};

export const getDefaultReportCardTemplate = (): ReportCardTemplate => {
  const service = new PDFGenerationService();
  return service.getDefaultReportCardTemplate();
};

export const pdfGenerationService = new PDFGenerationService();

// Export types for use in other files
export type {
  NewCurriculumReportCardData,
  ReportCardTemplate,
  TemplateField,
  TemplateSection,
  ReportCardData,
  ExamTimetableData,
  AssessmentReportData
};

// Timetable PDF Data Interfaces (moved inside class)
interface TimetablePDFData {
  school: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  generatedBy: {
    id: string;
    name: string;
    role: string;
  };
  timeStructure: {
    periodsPerDay: number;
    periodDuration: number; // in minutes
    breakTimes: Array<{
      name: string;
      startTime: string;
      duration: number;
    }>;
    schoolStartTime: string; // e.g., "08:00"
    schoolEndTime: string;   // e.g., "15:30"
  };
  slots: Array<{
    id: string;
    day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';
    period: number;
    startTime: string;
    endTime: string;
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
    roomId?: string;
    roomName?: string;
    isBreak: boolean;
    isPractical: boolean;
  }>;
}

interface ClassTimetablePDFData extends TimetablePDFData {
  class: {
    id: string;
    name: string;
    stream?: string;
  };
  classSlots: TimetablePDFData['slots'];
}

interface TeacherTimetablePDFData extends TimetablePDFData {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
    subjects: string[];
  };
  teacherSlots: TimetablePDFData['slots'];
  workloadSummary: {
    totalPeriods: number;
    periodsPerDay: number[];
    subjectDistribution: Array<{
      subjectName: string;
      periods: number;
      classes: string[];
    }>;
  };
}

// Export timetable PDF generation functions
export const generateTimetablePDFs = async (data: TimetablePDFData) => {
  const service = new PDFGenerationService();
  return service.generateTimetablePDFs(data);
};

// Export timetable PDF types
export type {
  TimetablePDFData,
  ClassTimetablePDFData,
  TeacherTimetablePDFData
};