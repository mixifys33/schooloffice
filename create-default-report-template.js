/**
 * Create Default Report Card Template
 * Run: node create-default-report-template.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DEFAULT_TEMPLATE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .school-motto { font-style: italic; color: #666; }
    .report-title { font-size: 18px; font-weight: bold; margin: 20px 0; }
    .student-info { margin: 20px 0; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-label { font-weight: bold; width: 150px; }
    .subjects-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .subjects-table th, .subjects-table td { border: 1px solid #333; padding: 8px; text-align: center; }
    .subjects-table th { background-color: #f0f0f0; font-weight: bold; }
    .subjects-table td.subject-name { text-align: left; }
    .comments { margin: 20px 0; }
    .comment-box { border: 1px solid #333; padding: 10px; margin-bottom: 15px; min-height: 60px; }
    .comment-label { font-weight: bold; margin-bottom: 5px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
    .signature { text-align: center; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; padding-top: 5px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="school-name">{{school.name}}</div>
    <div class="school-motto">{{school.motto}}</div>
    <div>{{school.address}}</div>
    <div>Tel: {{school.phone}} | Email: {{school.email}}</div>
  </div>

  <!-- Report Title -->
  <div class="report-title">END OF TERM REPORT CARD - {{term.name}}</div>

  <!-- Student Information -->
  <div class="student-info">
    <div class="info-row">
      <div class="info-label">Student Name:</div>
      <div>{{student.name}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Admission Number:</div>
      <div>{{student.admissionNumber}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Class:</div>
      <div>{{student.class}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Term:</div>
      <div>{{term.name}} ({{term.startDate}} - {{term.endDate}})</div>
    </div>
  </div>

  <!-- Subjects Table -->
  <table class="subjects-table">
    <thead>
      <tr>
        <th>Subject</th>
        <th>CA (40%)</th>
        <th>Exam (60%)</th>
        <th>Total (100)</th>
        <th>Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      {{#each subjects}}
      <tr>
        <td class="subject-name">{{this.name}}</td>
        <td>{{this.caScore}}</td>
        <td>{{this.examScore}}</td>
        <td>{{this.totalScore}}</td>
        <td>{{this.grade}}</td>
        <td>{{this.remarks}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="student-info">
    <div class="info-row">
      <div class="info-label">Total Marks:</div>
      <div>{{summary.totalMarks}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Average:</div>
      <div>{{summary.average}}%</div>
    </div>
    <div class="info-row">
      <div class="info-label">Position:</div>
      <div>{{summary.position}} out of {{summary.totalStudents}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Overall Grade:</div>
      <div>{{summary.grade}}</div>
    </div>
  </div>

  <!-- Attendance -->
  <div class="student-info">
    <div class="info-row">
      <div class="info-label">Days Present:</div>
      <div>{{attendance.present}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Days Absent:</div>
      <div>{{attendance.absent}}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Total Days:</div>
      <div>{{attendance.total}}</div>
    </div>
  </div>

  <!-- Comments -->
  <div class="comments">
    <div class="comment-label">Class Teacher's Comment:</div>
    <div class="comment-box">{{comments.classTeacher}}</div>

    <div class="comment-label">Head Teacher's Comment:</div>
    <div class="comment-box">{{comments.headTeacher}}</div>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="signature">
      <div class="signature-line">Class Teacher</div>
    </div>
    <div class="signature">
      <div class="signature-line">Head Teacher</div>
    </div>
    <div class="signature">
      <div class="signature-line">Parent/Guardian</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated on {{generatedDate}} | This is an official document from {{school.name}}
  </div>
</body>
</html>
`

async function createDefaultTemplate() {
  try {
    console.log('🔍 Finding schools without default templates...')

    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    })

    console.log(`📊 Found ${schools.length} schools`)

    for (const school of schools) {
      // Check if school already has a default template
      const existingTemplate = await prisma.reportTemplate.findFirst({
        where: {
          schoolId: school.id,
          isDefault: true
        }
      })

      if (existingTemplate) {
        console.log(`✅ ${school.name} already has a default template`)
        continue
      }

      // Get a staff member to be the creator (preferably admin)
      const staff = await prisma.staff.findFirst({
        where: { schoolId: school.id },
        orderBy: { createdAt: 'asc' }
      })

      if (!staff) {
        console.log(`⚠️  ${school.name} has no staff members, skipping...`)
        continue
      }

      // Create default template
      const template = await prisma.reportTemplate.create({
        data: {
          name: 'Classic Uganda Primary Report Card',
          type: 'NEW_CURRICULUM',
          content: DEFAULT_TEMPLATE_HTML,
          variables: {
            school: ['name', 'motto', 'address', 'phone', 'email'],
            student: ['name', 'admissionNumber', 'class'],
            term: ['name', 'startDate', 'endDate'],
            subjects: ['name', 'caScore', 'examScore', 'totalScore', 'grade', 'remarks'],
            summary: ['totalMarks', 'average', 'position', 'totalStudents', 'grade'],
            attendance: ['present', 'absent', 'total'],
            comments: ['classTeacher', 'headTeacher'],
            generatedDate: 'string'
          },
          isDefault: true,
          isActive: true,
          schoolId: school.id,
          createdById: staff.id
        }
      })

      console.log(`✅ Created default template for ${school.name}`)
    }

    console.log('\n✅ Default template creation complete!')
    console.log('\n📝 Template Features:')
    console.log('   - School header with name, motto, address')
    console.log('   - Student information section')
    console.log('   - Subjects table with CA, Exam, Total, Grade')
    console.log('   - Summary with total marks, average, position')
    console.log('   - Attendance summary')
    console.log('   - Class teacher and head teacher comments')
    console.log('   - Signature lines')
    console.log('   - Professional footer')
    console.log('\n🎯 Users can now generate reports without creating templates!')

  } catch (error) {
    console.error('❌ Error creating default template:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDefaultTemplate()
