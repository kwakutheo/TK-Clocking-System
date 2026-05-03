import 'package:equatable/equatable.dart';

class ReportSummary extends Equatable {
  final double totalHours;
  final int daysWorked;
  final int daysAbsent;
  final int daysLate;
  final int totalLateMinutes;
  final int daysEarlyDeparture;
  final int totalEarlyOutMinutes;
  final int daysForgotClockOut;

  const ReportSummary({
    required this.totalHours,
    required this.daysWorked,
    required this.daysAbsent,
    required this.daysLate,
    required this.totalLateMinutes,
    required this.daysEarlyDeparture,
    required this.totalEarlyOutMinutes,
    required this.daysForgotClockOut,
  });

  @override
  List<Object?> get props => [
        totalHours,
        daysWorked,
        daysAbsent,
        daysLate,
        totalLateMinutes,
        daysEarlyDeparture,
        totalEarlyOutMinutes,
        daysForgotClockOut,
      ];
}

class MonthSummary extends Equatable {
  final String name;
  final ReportSummary summary;

  const MonthSummary({
    required this.name,
    required this.summary,
  });

  @override
  List<Object?> get props => [name, summary];
}

class TermReportEntity extends Equatable {
  final String termName;
  final ReportSummary summary;
  final List<MonthSummary> months;

  const TermReportEntity({
    required this.termName,
    required this.summary,
    required this.months,
  });

  @override
  List<Object?> get props => [termName, summary, months];
}
