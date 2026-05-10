import 'package:equatable/equatable.dart';
import 'package:tk_clocking_system/shared/enums/user_role.dart';

/// Domain entity representing an authenticated user.
///
/// This is a pure Dart class with no framework or JSON dependencies.
class UserEntity extends Equatable {
  const UserEntity({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.username,
    required this.role,
    this.employeeId,
    this.employeeCode,
    this.photoUrl,
    this.departmentId,
    this.branchId,
  });

  final String id;
  final String? employeeId;
  final String fullName;
  final String email;
  final String phone;
  final String username;
  final UserRole role;
  final String? employeeCode;
  final String? photoUrl;
  final String? departmentId;
  final String? branchId;

  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty) return parts[0][0].toUpperCase();
    return '?';
  }

  @override
  List<Object?> get props => [id, employeeId, fullName, username, email, role];
}
