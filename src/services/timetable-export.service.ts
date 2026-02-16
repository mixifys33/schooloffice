/**
 * TIMETABLE EXPORT SERVICE
 *    
 * Handles PDF and Excel export of timetables for:
 * - Master timetable (all classes)
 * - Individual class timetables
 * - Teacher personal timetables
 * - Room schedules
 * 
 * Export formats:
 * - PDF: Printable, professional format
 * - Excel: Editable, data analysis
 * - CSV: Simple data export
 */

import { db } from '@/lib/db';
// import PDFDocument from 'pdfkit';
// import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import path from 'path';

interface ExportRequest {
  timetableId: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  viewType: 'MASTER' | 'CLASS' | 'TEACHER' | 'ROOM';
  entityId?: string; // Class ID, Teacher ID, or Room ID
  userId: string; // User requesting export
}

interface TimetableGrid {
  days: string[];
  periods: number[];
  slots: Map<string, any>; // key: "day-period-entityId", value: slot data
}

export class TimetableExportService {
  
  /**
   * Main export method - routes to appropriate format
   */
  async exportTimetable(request: ExportRequest): Promise<string> {
    console.log(`Exporting timetable ${request.timetableId} as ${request.format}`);
    
    // Verify access
    await this.verifyExportAccess(request);
    
    // Get timetable data
    const timetableData = await this.loadTimetableData(request);
    
    // Route to appropriate export handler
    switch (request.format) {
      case 'PDF':
        return await this.exportToPDF(timetableData, request);
      case 'EXCEL':
        return await this.exportToExcel(timetableData, request);
      case 'CSV':
        return await this.exportToCSV(timetableData, request);
      default:
        throw new Error(`Unsupported format: ${request.format}`);
    }
  }

  /**
   * Export timetable to PDF
   */
  private async exportToPDF(data: any, request: ExportRequest): Promise<string> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const fileName = `timetable-${request.viewType}-${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'public', 'exports', fileName);
    
    // Ensure export directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    const stream = require('fs').createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(18)
       .text(data.school.name, { align: 'center' })
       .fontSize(14)
       .text(`${data.term.name} Timetable`, { align: 'center' })
       .moveDown();

    if (request.viewType === 'TEACHER') {
      doc.fontSize(12).text(`Teacher: ${data.entityName}`, { align: 'center' }).moveDown();
    } else if (request.viewType === 'CLASS') {
      doc.fontSize(12).text(`Class: ${data.entityName}`, { align: 'center' }).moveDown();
    } else if (request.viewType === 'ROOM') {
      doc.fontSize(12).text(`Room: ${data.entityName}`, { align: 'center' }).moveDown();
    }

    // Timetable grid
    const grid = data.grid;
    const cellWidth = 100;
    const cellHeight = 40;
    const startX = 50;
    const startY = doc.y + 20;

    // Draw header row (days)
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Period', startX, startY, { width: cellWidth, align: 'center' });
    
    grid.days.forEach((day: string, index: number) => {
      doc.text(day, startX + (index + 1) * cellWidth, startY, { width: cellWidth, align: 'center' });
    });

    // Draw timetable rows
    doc.font('Helvetica');
    grid.periods.forEach((period: number, periodIndex: number) => {
      const y = startY + (periodIndex + 1) * cellHeight;
      
      // Period number
      doc.fontSize(9).text(`P${period}`, startX, y + 5, { width: cellWidth, align: 'center' });
      
      // Slots for each day
      grid.days.forEach((day: string, dayIndex: number) => {
        const slotKey = `${dayIndex + 1}-${period}${request.entityId ? `-${request.entityId}` : ''}`;
        const slot = grid.slots.get(slotKey);
        
        const x = startX + (dayIndex + 1) * cellWidth;
        
        if (slot) {
          const slotText = this.formatSlotForPDF(slot, request.viewType);
          doc.fontSize(8).text(slotText, x + 5, y + 5, { width: cellWidth - 10, lineGap: 2 });
        } else {
          doc.fontSize(8).text('-', x, y + 10, { width: cellWidth, align: 'center' });
        }
        
        // Draw cell border
        doc.rect(x, y, cellWidth, cellHeight).stroke();
      });
      
      // Draw period cell border
      doc.rect(startX, y, cellWidth, cellHeight).stroke();
    });

    // Footer
    doc.fontSize(8)
       .text(`Generated on ${new Date().toLocaleString()}`, startX, doc.page.height - 50, { align: 'left' })
       .text(`Version ${data.timetable.version}`, { align: 'right' });

    doc.end();

    await new Promise((resolve) => stream.on('finish', resolve));
    
    console.log(`PDF exported successfully: ${filePath}`);
    return `/exports/${fileName}`;
  }

  /**
   * Export timetable to Excel
   */
  private async exportToExcel(data: any, request: ExportRequest): Promise<string> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timetable');

    // Set column widths
    worksheet.columns = [
      { header: 'Period', key: 'period', width: 10 },
      ...data.grid.days.map((day: string) => ({ header: day, key: day.toLowerCase(), width: 25 }))
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.grid.periods.forEach((period: number) => {
      const row: any = { period: `P${period}` };
      
      data.grid.days.forEach((day: string, dayIndex: number) => {
        const slotKey = `${dayIndex + 1}-${period}${request.entityId ? `-${request.entityId}` : ''}`;
        const slot = data.grid.slots.get(slotKey);
        
        row[day.toLowerCase()] = slot ? this.formatSlotForExcel(slot, request.viewType) : '-';
      });
      
      worksheet.addRow(row);
    });

    // Style all cells
    worksheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
    });

    // Add metadata sheet
    const metadataSheet = workbook.addWorksheet('Metadata');
    metadataSheet.addRows([
      ['School', data.school.name],
      ['Term', data.term.name],
      ['View Type', request.viewType],
      ['Entity', data.entityName || 'All'],
      ['Version', data.timetable.version],
      ['Generated', new Date().toLocaleString()]
    ]);

    // Save file
    const fileName = `timetable-${request.viewType}-${Date.now()}.xlsx`;
    const filePath = path.join(process.cwd(), 'public', 'exports', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`Excel exported successfully: ${filePath}`);
    return `/exports/${fileName}`;
  }

  /**
   * Export timetable to CSV
   */
  private async exportToCSV(data: any, request: ExportRequest): Promise<string> {
    const rows: string[][] = [];
    
    // Header row
    const header = ['Period', ...data.grid.days];
    rows.push(header);
    
    // Data rows
    data.grid.periods.forEach((period: number) => {
      const row = [`P${period}`];
      
      data.grid.days.forEach((day: string, dayIndex: number) => {
        const slotKey = `${dayIndex + 1}-${period}${request.entityId ? `-${request.entityId}` : ''}`;
        const slot = data.grid.slots.get(slotKey);
        
        row.push(slot ? this.formatSlotForCSV(slot, request.viewType) : '-');
      });
      
      rows.push(row);
    });
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Save file
    const fileName = `timetable-${request.viewType}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), 'public', 'exports', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, csvContent, 'utf-8');
    
    console.log(`CSV exported successfully: ${filePath}`);
    return `/exports/${fileName}`;
  }

  /**
   * Generate secure download link with expiry
   */
  async generateSecureLink(
    filePath: string,
    userId: string,
    expiresInHours: number = 24
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    const token = this.generateSecureToken();
    
    // Store link in database (you'd need to create SecureExportLink model)
    // await db.secureExportLink.create({
    //   data: {
    //     token,
    //     filePath,
    //     userId,
    //     expiresAt,
    //     accessCount: 0,
    //     maxAccess: 5
    //   }
    // });
    
    const secureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/timetable/download/${token}`;
    
    console.log(`Generated secure link: ${secureUrl} (expires: ${expiresAt})`);
    return secureUrl;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async verifyExportAccess(request: ExportRequest): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: request.userId },
      include: { staff: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // DoS can export everything
    if (user.roles.includes('DOS') || user.role === 'DOS') {
      return;
    }

    // Teachers can only export their own timetable
    if (request.viewType === 'TEACHER') {
      if (!user.staff || user.staff.id !== request.entityId) {
        throw new Error('Teachers can only export their own timetable');
      }
      return;
    }

    // Class teachers can export their class timetable
    if (request.viewType === 'CLASS' && user.staff) {
      const isClassTeacher = await db.staffClass.findFirst({
        where: {
          staffId: user.staff.id,
          classId: request.entityId
        }
      });
      
      if (isClassTeacher) {
        return;
      }
    }

    throw new Error('Unauthorized to export this timetable view');
  }

  private async loadTimetableData(request: ExportRequest): Promise<any> {
    // Get timetable with all relations
    const timetable = await db.timetableDraft.findUnique({
      where: { id: request.timetableId },
      include: {
        school: true,
        term: {
          include: {
            academicYear: true
          }
        },
        slots: {
          include: {
            class: true,
            subject: true,
            teacher: true,
            room: true
          }
        }
      }
    });

    if (!timetable) {
      throw new Error('Timetable not found');
    }

    // Get time structure
    const timeStructure = await db.schoolTimeStructure.findFirst({
      where: {
        schoolId: timetable.schoolId,
        isActive: true
      }
    });

    if (!timeStructure) {
      throw new Error('School time structure not found');
    }

    // Build grid
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = Array.from({ length: timeStructure.periodsPerDay }, (_, i) => i + 1);
    
    // Filter slots based on view type
    let filteredSlots = timetable.slots;
    let entityName = '';
    
    if (request.viewType === 'CLASS' && request.entityId) {
      filteredSlots = timetable.slots.filter((slot: any) => slot.classId === request.entityId);
      const classData = await db.class.findUnique({ where: { id: request.entityId } });
      entityName = classData?.name || '';
    } else if (request.viewType === 'TEACHER' && request.entityId) {
      filteredSlots = timetable.slots.filter((slot: any) => slot.teacherId === request.entityId);
      const teacherData = await db.staff.findUnique({ where: { id: request.entityId } });
      entityName = teacherData ? `${teacherData.firstName} ${teacherData.lastName}` : '';
    } else if (request.viewType === 'ROOM' && request.entityId) {
      filteredSlots = timetable.slots.filter((slot: any) => slot.roomId === request.entityId);
      const roomData = await db.room.findUnique({ where: { id: request.entityId } });
      entityName = roomData?.name || '';
    }

    // Build slot map
    const slotsMap = new Map<string, any>();
    filteredSlots.forEach((slot: any) => {
      const key = `${slot.dayOfWeek}-${slot.period}${request.entityId ? `-${request.entityId}` : ''}`;
      slotsMap.set(key, slot);
    });

    return {
      timetable,
      school: timetable.school,
      term: timetable.term,
      timeStructure,
      entityName,
      grid: {
        days,
        periods,
        slots: slotsMap
      }
    };
  }

  private formatSlotForPDF(slot: any, viewType: string): string {
    switch (viewType) {
      case 'TEACHER':
        return `${slot.subject.name}\n${slot.class.name}\n${slot.roomName || 'TBA'}`;
      case 'CLASS':
        return `${slot.subject.name}\n${slot.teacher.firstName} ${slot.teacher.lastName}\n${slot.roomName || 'TBA'}`;
      case 'ROOM':
        return `${slot.subject.name}\n${slot.class.name}\n${slot.teacher.firstName} ${slot.teacher.lastName}`;
      case 'MASTER':
        return `${slot.class.name}\n${slot.subject.name}\n${slot.teacher.firstName} ${slot.teacher.lastName}`;
      default:
        return slot.subject.name;
    }
  }

  private formatSlotForExcel(slot: any, viewType: string): string {
    switch (viewType) {
      case 'TEACHER':
        return `${slot.subject.name} - ${slot.class.name} - ${slot.roomName || 'TBA'}`;
      case 'CLASS':
        return `${slot.subject.name} - ${slot.teacher.firstName} ${slot.teacher.lastName} - ${slot.roomName || 'TBA'}`;
      case 'ROOM':
        return `${slot.subject.name} - ${slot.class.name} - ${slot.teacher.firstName} ${slot.teacher.lastName}`;
      case 'MASTER':
        return `${slot.class.name} - ${slot.subject.name} - ${slot.teacher.firstName} ${slot.teacher.lastName}`;
      default:
        return slot.subject.name;
    }
  }

  private formatSlotForCSV(slot: any, viewType: string): string {
    return this.formatSlotForExcel(slot, viewType);
  }

  private generateSecureToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

export const timetableExportService = new TimetableExportService();
