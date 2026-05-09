import { Injectable } from '@nestjs/common';
import { AttendanceReportService } from './attendance-report.service';
const pdfmake = require('pdfmake');

@Injectable()
export class AttendanceExportService {
  constructor(private readonly reportService: AttendanceReportService) {
    // Use standard PDF fonts so we don't need TTF files
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    pdfmake.setFonts(fonts);
  }

  async exportMonthlyPdf(employeeId: string, month: number, year: number): Promise<Buffer> {
    const report = await this.reportService.getMonthlyReport(employeeId, month, year);
    const docDefinition = this.buildMonthlyDocDefinition(report, month, year);
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  async exportTermPdf(employeeId: string, termId: string): Promise<Buffer> {
    const report = await this.reportService.getTermReport(employeeId, termId);
    const docDefinition = this.buildTermDocDefinition(report);
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  private formatMinutes(mins: number): string {
    if (!mins || mins === 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  private buildMonthlyDocDefinition(report: any, month: number, year: number): any {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[month - 1];

    const footerFn = function(currentPage: number, pageCount: number) {
      return {
        columns: [
          { 
            image: require('path').join(process.cwd(), '..', 'dashboard', 'public', 'logo.png'), 
            width: 20, 
            margin: [0, -2, 5, 0] 
          },
          { text: 'TK Clocking System', alignment: 'left', margin: [0, 2, 0, 0], color: '#6b7280', fontSize: 9 },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 2, 0, 0], color: '#6b7280', fontSize: 9 }
        ],
        margin: [40, 10, 40, 0]
      };
    };

    return {
      footer: footerFn,
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      content: [
        { text: 'Monthly Attendance Report', style: 'header' },
        { text: `Employee: ${report.employee.fullName} (${report.employee.code})`, style: 'subheader' },
        { text: `Period: ${monthName} ${year}`, style: 'subheader', margin: [0, 0, 0, 15] },
        this.buildSummaryTable(report.summary),
        { text: 'Daily Log', style: 'sectionHeader', margin: [0, 20, 0, 10] },
        this.buildDailyLogTable(report.days)
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
        subheader: { fontSize: 12, color: '#4b5563', margin: [0, 0, 0, 5] },
        sectionHeader: { fontSize: 14, bold: true },
        tableHeader: { bold: true, fillColor: '#f3f4f6', color: '#374151' }
      }
    };
  }

  private buildTermDocDefinition(report: any): any {
    const content: any[] = [
      { text: 'Academic Term Attendance Report', style: 'coverTitle', alignment: 'center', margin: [0, 60, 0, 10] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 20] },
      { text: report.employee.fullName, style: 'coverName', alignment: 'center' },
      { text: `Employee ID: ${report.employee.code}`, style: 'coverSub', alignment: 'center', margin: [0, 5, 0, 20] },
      { text: `Term: ${report.term.name}`, style: 'coverSub', alignment: 'center' },
      { text: `Academic Year: ${report.term.academicYear}`, style: 'coverSub', alignment: 'center', margin: [0, 5, 0, 40] },
      { text: 'Term Summary Overview', style: 'sectionHeader', alignment: 'center', margin: [0, 0, 0, 15] },
      this.buildSummaryTable(report.summary)
    ];

    report.months.forEach((m: any) => {
      content.push({ text: m.name, style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
      content.push(this.buildSummaryTable(m.summary));
      content.push({ text: 'Daily Log', style: 'subheader', margin: [0, 15, 0, 5] });
      content.push(this.buildDailyLogTable(m.days));
    });

    const footerFn = function(currentPage: number, pageCount: number) {
      return {
        columns: [
          { 
            image: require('path').join(process.cwd(), '..', 'dashboard', 'public', 'logo.png'), 
            width: 20, 
            margin: [0, -2, 5, 0] 
          },
          { text: 'TK Clocking System', alignment: 'left', margin: [0, 2, 0, 0], color: '#6b7280', fontSize: 9 },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 2, 0, 0], color: '#6b7280', fontSize: 9 }
        ],
        margin: [40, 10, 40, 0]
      };
    };

    return {
      footer: footerFn,
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      content,
      styles: {
        coverTitle: { fontSize: 24, bold: true, color: '#111827' },
        coverName: { fontSize: 20, bold: true, color: '#2563eb' },
        coverSub: { fontSize: 14, color: '#4b5563' },
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
        subheader: { fontSize: 12, color: '#4b5563', margin: [0, 0, 0, 5] },
        sectionHeader: { fontSize: 14, bold: true },
        tableHeader: { bold: true, fillColor: '#f3f4f6', color: '#374151' }
      }
    };
  }

  private buildSummaryTable(summary: any) {
    return {
      margin: [0, 5, 0, 20],
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Total Hours', bold: true, fillColor: '#f8fafc' },
            { text: `${summary.totalHours}h` },
            { text: 'Days Worked', bold: true, fillColor: '#f8fafc' },
            { text: summary.daysWorked.toString() }
          ],
          [
            { text: 'Days Absent', bold: true, fillColor: '#f8fafc' },
            { text: summary.daysAbsent.toString() },
            { text: 'Days Late', bold: true, fillColor: '#f8fafc' },
            { text: `${summary.daysLate} (${this.formatMinutes(summary.totalLateMinutes)})` }
          ],
          [
            { text: 'Early Departures', bold: true, fillColor: '#f8fafc' },
            { text: `${summary.daysEarlyDeparture} (${this.formatMinutes(summary.totalEarlyOutMinutes)})` },
            { text: 'Missed Clock-Out', bold: true, fillColor: '#f8fafc' },
            { text: summary.daysForgotClockOut.toString() }
          ]
        ]
      },
      layout: {
        hLineWidth: (i: number, node: any) => 1,
        vLineWidth: (i: number, node: any) => 1,
        hLineColor: (i: number, node: any) => '#e2e8f0',
        vLineColor: (i: number, node: any) => '#e2e8f0',
        paddingLeft: (i: number, node: any) => 12,
        paddingRight: (i: number, node: any) => 12,
        paddingTop: (i: number, node: any) => 10,
        paddingBottom: (i: number, node: any) => 10,
      }
    };
  }

  private buildDailyLogTable(days: any[]) {
    const tableBody = days.map(d => {
      let statusColor = '#000000';
      if (d.status === 'ABSENT') statusColor = '#ef4444';
      else if (d.status.includes('HOLIDAY') || d.status === 'WEEKEND') statusColor = '#6b7280';
      else if (d.status === 'PRESENT') statusColor = '#059669'; // Darker green for good contrast

      return [
        d.date,
        { text: d.status, color: statusColor, bold: d.status === 'ABSENT' || d.status === 'PRESENT' },
        d.clockIn ? new Date(d.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        d.clockOut ? new Date(d.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        `${d.hours}h`,
        d.isLate ? `Yes (${this.formatMinutes(d.lateMinutes)})` : 'No',
        d.isEarlyOut ? `Yes (${this.formatMinutes(d.earlyOutMinutes)})` : 'No'
      ];
    });

    tableBody.unshift([
      { text: 'Date', style: 'tableHeader' } as any,
      { text: 'Status', style: 'tableHeader' },
      { text: 'In', style: 'tableHeader' },
      { text: 'Out', style: 'tableHeader' },
      { text: 'Hours', style: 'tableHeader' },
      { text: 'Late', style: 'tableHeader' },
      { text: 'Early Out', style: 'tableHeader' }
    ]);

    return {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: tableBody
      },
      layout: 'lightHorizontalLines'
    };
  }
}
