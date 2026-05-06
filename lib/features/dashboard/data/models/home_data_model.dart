import 'package:tk_clocking_system/features/dashboard/domain/entities/home_data_entity.dart';
import 'package:tk_clocking_system/shared/enums/attendance_type.dart';

class HomeDataModel extends HomeDataEntity {
  const HomeDataModel({
    super.lastActivityType,
    super.lastActivityTime,
    required super.isClockedIn,
    super.clockedInTime,
    super.forgotToClockOut,
    super.isLateToday,
    super.lateStatus,
    super.isShiftOver,
    super.isAbsentToday,
    required super.todayHours,
    required super.weekHours,
    required super.daysWorkedThisWeek,
    super.isHoliday,
    super.holidayName,
    super.isWeekend,
    super.isVacation,
    super.vacationName,
    super.isOnBreak,
    super.noShiftAssigned,
    super.shiftStartTime,
    super.adminOverrideName,
    super.adminOverrideNote,
  });

  factory HomeDataModel.fromJson(Map<String, dynamic> json) {
    AttendanceType? lastActivityType;
    DateTime? lastActivityTime;
    
    if (json['lastActivity'] != null) {
      lastActivityType = AttendanceType.fromValue(json['lastActivity']['type'] as String? ?? '');
      if (json['lastActivity']['timestamp'] != null) {
        lastActivityTime = DateTime.tryParse(json['lastActivity']['timestamp'].toString());
      }
    }

    DateTime? clockedInTime;
    if (json['clockedInTime'] != null) {
      clockedInTime = DateTime.tryParse(json['clockedInTime'].toString());
    }

    // Parse lateStatus from backend string value
    LateStatus lateStatus = LateStatus.none;
    final rawLateStatus = json['lateStatus'] as String?;
    if (rawLateStatus == 'late') {
      lateStatus = LateStatus.late;
    } else if (rawLateStatus == 'persistent_late') {
      lateStatus = LateStatus.persistentLate;
    }

    return HomeDataModel(
      lastActivityType: lastActivityType,
      lastActivityTime: lastActivityTime,
      isClockedIn: json['isClockedIn'] as bool? ?? false,
      clockedInTime: clockedInTime,
      forgotToClockOut: json['forgotToClockOut'] as bool? ?? false,
      isLateToday: json['isLateToday'] as bool? ?? false,
      lateStatus: lateStatus,
      isShiftOver: json['isShiftOver'] as bool? ?? false,
      isAbsentToday: json['isAbsentToday'] as bool? ?? false,
      todayHours: (json['todayHours'] as num?)?.toDouble() ?? 0.0,
      weekHours: (json['weekHours'] as num?)?.toDouble() ?? 0.0,
      daysWorkedThisWeek: (json['daysWorkedThisWeek'] as num?)?.toInt() ?? 0,
      isHoliday: json['isHoliday'] as bool? ?? false,
      holidayName: json['holidayName'] as String?,
      isWeekend: json['isWeekend'] as bool? ?? false,
      isVacation: json['isVacation'] as bool? ?? false,
      vacationName: json['vacationName'] as String?,
      shiftStartTime: json['shiftStartTime'] as String?,
      adminOverrideName: json['adminOverride'] != null
          ? json['adminOverride']['adminName'] as String?
          : null,
      adminOverrideNote: json['adminOverride'] != null
          ? json['adminOverride']['note'] as String?
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lastActivity': lastActivityType != null
          ? {
              'type': lastActivityType,
              'timestamp': lastActivityTime?.toIso8601String(),
            }
          : null,
      'isClockedIn': isClockedIn,
      'clockedInTime': clockedInTime?.toIso8601String(),
      'isOnBreak': isOnBreak,
      'forgotToClockOut': forgotToClockOut,
      'isLateToday': isLateToday,
      'lateStatus': lateStatus.name,
      'isShiftOver': isShiftOver,
      'isAbsentToday': isAbsentToday,
      'isWeekend': isWeekend,
      'isVacation': isVacation,
      'vacationName': vacationName,
      'noShiftAssigned': noShiftAssigned,
      'todayHours': todayHours,
      'weekHours': weekHours,
      'daysWorkedThisWeek': daysWorkedThisWeek,
      'isHoliday': isHoliday,
      'holidayName': holidayName,
      'shiftStartTime': shiftStartTime,
      // Must match fromJson's nested structure exactly so the cache round-trips correctly
      'adminOverride': (adminOverrideName != null)
          ? {
              'adminName': adminOverrideName,
              'note': adminOverrideNote ?? '',
            }
          : null,
    };
  }
}
