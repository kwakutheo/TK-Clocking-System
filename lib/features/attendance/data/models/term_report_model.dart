import 'package:tk_clocking_system/features/attendance/domain/entities/term_report_entity.dart';

class ReportSummaryModel extends ReportSummary {
  const ReportSummaryModel({
    required super.totalHours,
    required super.daysWorked,
    required super.daysAbsent,
    required super.daysLate,
    required super.totalLateMinutes,
    required super.daysEarlyDeparture,
    required super.totalEarlyOutMinutes,
    required super.daysForgotClockOut,
  });

  factory ReportSummaryModel.fromJson(Map<String, dynamic> json) {
    return ReportSummaryModel(
      totalHours: (json['totalHours'] as num?)?.toDouble() ?? 0.0,
      daysWorked: json['daysWorked'] as int? ?? 0,
      daysAbsent: json['daysAbsent'] as int? ?? 0,
      daysLate: json['daysLate'] as int? ?? 0,
      totalLateMinutes: json['totalLateMinutes'] as int? ?? 0,
      daysEarlyDeparture: json['daysEarlyDeparture'] as int? ?? 0,
      totalEarlyOutMinutes: json['totalEarlyOutMinutes'] as int? ?? 0,
      daysForgotClockOut: json['daysForgotClockOut'] as int? ?? 0,
    );
  }
}

class MonthSummaryModel extends MonthSummary {
  const MonthSummaryModel({
    required super.name,
    required super.summary,
  });

  factory MonthSummaryModel.fromJson(Map<String, dynamic> json) {
    return MonthSummaryModel(
      name: json['name'] as String? ?? '',
      summary: ReportSummaryModel.fromJson(json['summary'] as Map<String, dynamic>? ?? {}),
    );
  }
}

class TermReportModel extends TermReportEntity {
  const TermReportModel({
    required super.termName,
    required super.summary,
    required super.months,
  });

  factory TermReportModel.fromJson(Map<String, dynamic> json) {
    final termName = (json['term'] as Map<String, dynamic>?)?['name'] as String? ?? 'Current Term';
    
    final summary = ReportSummaryModel.fromJson(json['summary'] as Map<String, dynamic>? ?? {});
    
    final monthsList = json['months'] as List<dynamic>? ?? [];
    final months = monthsList
        .cast<Map<String, dynamic>>()
        .map(MonthSummaryModel.fromJson)
        .toList();

    return TermReportModel(
      termName: termName,
      summary: summary,
      months: months,
    );
  }
}
