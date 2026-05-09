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

  private buildMonthlyDocDefinition(report: any, month: number, year: number): any {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[month - 1];

    return {
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
      { text: 'Academic Term Attendance Report', style: 'header' },
      { text: `Employee: ${report.employee.fullName} (${report.employee.code})`, style: 'subheader' },
      { text: `Term: ${report.term.name} (${report.term.academicYear})`, style: 'subheader', margin: [0, 0, 0, 15] },
      this.buildSummaryTable(report.summary)
    ];

    report.months.forEach((m: any) => {
      content.push({ text: m.name, style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' });
      content.push(this.buildSummaryTable(m.summary));
      content.push({ text: 'Daily Log', style: 'subheader', margin: [0, 15, 0, 5] });
      content.push(this.buildDailyLogTable(m.days));
    });

    return {
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      content,
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
        subheader: { fontSize: 12, color: '#4b5563', margin: [0, 0, 0, 5] },
        sectionHeader: { fontSize: 14, bold: true },
        tableHeader: { bold: true, fillColor: '#f3f4f6', color: '#374151' }
      }
    };
  }

  private buildSummaryTable(summary: any) {
    return {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            { text: 'Metric', style: 'tableHeader' },
            { text: 'Value', style: 'tableHeader' },
            { text: 'Metric', style: 'tableHeader' },
            { text: 'Value', style: 'tableHeader' }
          ],
          [
            'Total Hours', `${summary.totalHours}h`,
            'Days Worked', summary.daysWorked.toString()
          ],
          [
            'Days Absent', summary.daysAbsent.toString(),
            'Days Late', `${summary.daysLate} (${summary.totalLateMinutes} mins)`
          ],
          [
            'Early Departures', `${summary.daysEarlyDeparture} (${summary.totalEarlyOutMinutes} mins)`,
            'Missed Clock-Out', summary.daysForgotClockOut.toString()
          ]
        ]
      },
      layout: 'lightHorizontalLines'
    };
  }

  private buildDailyLogTable(days: any[]) {
    const tableBody = days.map(d => {
      let statusColor = '#000000';
      if (d.status === 'ABSENT') statusColor = '#ef4444';
      else if (d.status.includes('HOLIDAY') || d.status === 'WEEKEND') statusColor = '#6b7280';
      else if (d.status === 'PRESENT') statusColor = '#10b981';

      return [
        d.date,
        { text: d.status, color: statusColor, bold: d.status === 'ABSENT' },
        d.clockIn ? new Date(d.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        d.clockOut ? new Date(d.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        `${d.hours}h`,
        d.isLate ? `Yes (${d.lateMinutes}m)` : 'No',
        d.isEarlyOut ? `Yes (${d.earlyOutMinutes}m)` : 'No'
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
