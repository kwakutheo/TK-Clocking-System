import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:tk_clocking_system/core/errors/failures.dart';
import 'package:tk_clocking_system/core/network/api_client.dart';
import 'package:tk_clocking_system/features/profile/data/models/employee_status_log_model.dart';
import 'package:tk_clocking_system/features/profile/domain/entities/employee_status_log_entity.dart';
import 'package:tk_clocking_system/features/profile/domain/repositories/profile_repository.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ApiClient _apiClient;

  ProfileRepositoryImpl({required ApiClient apiClient}) : _apiClient = apiClient;

  @override
  Future<Either<Failure, List<EmployeeStatusLogEntity>>> getWorkHistory({String? employeeId}) async {
    try {
      final endpoint = employeeId != null ? '/employees/$employeeId/history' : '/employees/me/history';
      final response = await _apiClient.get<List<dynamic>>(endpoint);

      final data = response.data;
      if (data == null) {
        return const Right([]);
      }

      final history = data
          .map((json) => EmployeeStatusLogModel.fromJson(json as Map<String, dynamic>))
          .toList();

      return Right(history);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        return const Left(NetworkFailure());
      }
      return Left(ServerFailure(e.message ?? 'Failed to fetch work history.'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
