import 'package:equatable/equatable.dart';
import 'package:tk_clocking_system/shared/enums/attendance_type.dart';

/// Describes the employee's late-arrival state for the current day.
enum LateStatus {
  /// Not late or shift not started yet.
  none,

  /// Late by less than 3 hours — show "You are Late!" warning.
  late,

  /// Late by more than 3 hours — show persistent "Still not clocked in" alert.
  persistentLate,
}

class HomeDataEntity extends Equatable {
  final AttendanceType? lastActivityType;
  final DateTime? lastActivityTime;
  final bool isClockedIn;
  final DateTime? clockedInTime;
  final bool forgotToClockOut;
  final bool isLateToday;
  final LateStatus lateStatus;
  final bool isShiftOver;
  final bool isAbsentToday;
  final double todayHours;
  final double weekHours;
  final int daysWorkedThisWeek;
  final bool isHoliday;
  final String? holidayName;
  final bool isWeekend;
  final bool isVacation;
  final String? vacationName;
  final bool isOnBreak;
  final bool noShiftAssigned;
  /// Shift start time in "HH:mm" format, used for the pre-shift countdown banner.
  final String? shiftStartTime;

  const HomeDataEntity({
    this.lastActivityType,
    this.lastActivityTime,
    required this.isClockedIn,
    this.clockedInTime,
    this.isOnBreak = false,
    this.forgotToClockOut = false,
    this.isLateToday = false,
    this.lateStatus = LateStatus.none,
    this.isShiftOver = false,
    this.isAbsentToday = false,
    required this.todayHours,
    required this.weekHours,
    required this.daysWorkedThisWeek,
    this.isHoliday = false,
    this.holidayName,
    this.isWeekend = false,
    this.isVacation = false,
    this.vacationName,
    this.noShiftAssigned = false,
    this.shiftStartTime,
  });

  @override
  List<Object?> get props => [
        lastActivityType,
        lastActivityTime,
        isClockedIn,
        clockedInTime,
        isOnBreak,
        forgotToClockOut,
        isLateToday,
        lateStatus,
        isShiftOver,
        isAbsentToday,
        todayHours,
        weekHours,
        daysWorkedThisWeek,
        isHoliday,
        holidayName,
        isWeekend,
        isVacation,
        vacationName,
        noShiftAssigned,
        shiftStartTime,
      ];
}
