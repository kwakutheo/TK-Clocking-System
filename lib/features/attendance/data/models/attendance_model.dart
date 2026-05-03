import 'package:tk_clocking_system/features/attendance/domain/entities/attendance_entity.dart';
import 'package:tk_clocking_system/shared/enums/attendance_type.dart';
import 'package:tk_clocking_system/shared/enums/sync_status.dart';
import 'package:uuid/uuid.dart';

/// Data model extending [AttendanceEntity] with JSON serialisation.
class AttendanceModel extends AttendanceEntity {
  const AttendanceModel({
    required super.id,
    required super.employeeId,
    required super.type,
    required super.timestamp,
    required super.syncStatus,
    super.branchId,
    super.latitude,
    super.longitude,
    super.selfieUrl,
    super.deviceId,
  });

  /// Creates a new pending (offline) attendance record with a local UUID.
  factory AttendanceModel.pending({
    required String employeeId,
    required AttendanceType type,
    required double latitude,
    required double longitude,
    String? branchId,
    String? deviceId,
  }) =>
      AttendanceModel(
        id: const Uuid().v4(),
        employeeId: employeeId,
        type: type,
        timestamp: DateTime.now(),
        syncStatus: SyncStatus.pending,
        branchId: branchId,
        latitude: latitude,
        longitude: longitude,
        deviceId: deviceId,
      );

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    // Handle both flat API responses (snake_case) and nested TypeORM
    // entity responses (camelCase with relation objects).
    final employeeId = json['employee_id'] as String? ??
        (json['employee'] as Map<String, dynamic>?)?['id'] as String? ??
        '';
    final branchId = json['branch_id'] as String? ??
        (json['branch'] as Map<String, dynamic>?)?['id'] as String?;
    final deviceId =
        json['device_id'] as String? ?? json['deviceId'] as String?;
    final selfieUrl =
        json['selfie_url'] as String? ?? json['selfieUrl'] as String?;

    // Backend returns `isOfflineSync` boolean; app uses `sync_status` enum.
    final syncStatus = json['sync_status'] != null
        ? SyncStatus.fromValue(json['sync_status'] as String)
        : (json['isOfflineSync'] == true)
            ? SyncStatus.pending
            : SyncStatus.synced;

    double? parseDouble(dynamic val) {
      if (val == null) return null;
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val);
      return null;
    }

    return AttendanceModel(
      id: json['id']?.toString() ?? const Uuid().v4(),
      employeeId: employeeId,
      type: AttendanceType.fromValue(json['type'] as String? ?? 'CLOCK_IN'),
      timestamp: json['timestamp'] != null 
          ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      syncStatus: syncStatus,
      branchId: branchId,
      latitude: parseDouble(json['latitude']),
      longitude: parseDouble(json['longitude']),
      selfieUrl: selfieUrl,
      deviceId: deviceId,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'employee_id': employeeId,
        'type': type.value,
        'timestamp': timestamp.toIso8601String(),
        'branch_id': branchId,
        'latitude': latitude,
        'longitude': longitude,
        'selfie_url': selfieUrl,
        'device_id': deviceId,
        'sync_status': syncStatus.value,
      };

  /// JSON for backend API (handles snake_case to camelCase conversion)
  Map<String, dynamic> toApiJson() => {
        'type': type.value,
        'timestamp': timestamp.toIso8601String(),
        'latitude': latitude,
        'longitude': longitude,
        'branchId': branchId,
        'deviceId': deviceId,
        'isOfflineSync': syncStatus == SyncStatus.pending,
      };
}
