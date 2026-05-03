import 'package:equatable/equatable.dart';

class AcademicTermEntity extends Equatable {
  final String id;
  final String name;
  final String academicYear;
  final bool isActive;

  const AcademicTermEntity({
    required this.id,
    required this.name,
    required this.academicYear,
    required this.isActive,
  });

  @override
  List<Object?> get props => [id, name, academicYear, isActive];
}
