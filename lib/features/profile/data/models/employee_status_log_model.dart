import 'package:tk_clocking_system/features/profile/domain/entities/employee_status_log_entity.dart';

class EmployeeStatusLogModel extends EmployeeStatusLogEntity {
  const EmployeeStatusLogModel({
    required super.id,
    required super.status,
    required super.startDate,
    super.endDate,
    required super.createdAt,
  });

  factory EmployeeStatusLogModel.fromJson(Map<String, dynamic> json) {
    return EmployeeStatusLogModel(
      id: json['id'] as String,
      status: json['status'] as String,
      startDate: DateTime.parse(json['startDate'] as String).toLocal(),
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate'] as String).toLocal() : null,
      createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'status': status,
      'startDate': startDate.toUtc().toIso8601String(),
      'endDate': endDate?.toUtc().toIso8601String(),
      'createdAt': createdAt.toUtc().toIso8601String(),
    };
  }
}
