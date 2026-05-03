import 'dart:convert';

import 'package:tk_clocking_system/features/auth/domain/entities/user_entity.dart';
import 'package:tk_clocking_system/shared/enums/user_role.dart';

/// Data model that extends [UserEntity] with JSON serialisation.
class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.fullName,
    required super.email,
    required super.phone,
    required super.username,
    required super.role,
    super.employeeCode,
    super.photoUrl,
    super.departmentId,
    super.branchId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as String,
        fullName: (json['full_name'] ?? json['fullName']) as String,
        email: (json['email'] as String?) ?? '',
        phone: (json['phone'] as String?) ?? '',
        username: (json['username'] as String?) ?? '',
        role: UserRole.fromValue(json['role'] as String),
        employeeCode:
            (json['employee_code'] ?? json['employeeCode']) as String?,
        photoUrl: (json['photo_url'] ?? json['photoUrl']) as String?,
        departmentId:
            (json['department_id'] ?? json['departmentId']) as String?,
        branchId: (json['branch_id'] ?? json['branchId']) as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'full_name': fullName,
        'email': email,
        'phone': phone,
        'username': username,
        'role': role.value,
        'employee_code': employeeCode,
        'photo_url': photoUrl,
        'department_id': departmentId,
        'branch_id': branchId,
      };

  /// Serialises to a JSON string for [StorageService].
  String toJsonString() => jsonEncode(toJson());

  /// Deserialises from a JSON string stored in [StorageService].
  static UserModel fromJsonString(String jsonString) =>
      UserModel.fromJson(jsonDecode(jsonString) as Map<String, dynamic>);
}
