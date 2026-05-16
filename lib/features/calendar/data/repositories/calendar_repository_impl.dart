import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:tk_clocking_system/core/network/api_client.dart';
import 'package:tk_clocking_system/features/calendar/data/models/calendar_models.dart';
import 'package:tk_clocking_system/features/calendar/domain/entities/calendar_entities.dart';
import 'package:tk_clocking_system/features/calendar/domain/repositories/calendar_repository.dart';

class CalendarRepositoryImpl implements CalendarRepository {
  final ApiClient apiClient;

  CalendarRepositoryImpl({required this.apiClient});

  @override
  Future<Either<String, List<AcademicTermEntity>>> getTerms() async {
    try {
      final response = await apiClient.get('/academic-calendar/terms');
      final List<dynamic> data = response.data;
      final terms = data
          .cast<Map<String, dynamic>>()
          .map((json) => AcademicTermModel.fromJson(json))
          .toList();
      return Right(terms);
    } on DioException catch (e) {
      return Left(e.response?.data?['message'] ?? 'Failed to load calendar');
    } catch (e) {
      return Left('An unexpected error occurred');
    }
  }

  @override
  Future<Either<String, List<HolidayEntity>>> getHolidays() async {
    try {
      final response = await apiClient.get('/holidays');
      final List<dynamic> data = response.data;
      final holidays = data
          .cast<Map<String, dynamic>>()
          .map((json) => HolidayModel.fromJson(json))
          .toList();
      return Right(holidays);
    } on DioException catch (e) {
      return Left(e.response?.data?['message'] ?? 'Failed to load holidays');
    } catch (e) {
      return Left('An unexpected error occurred');
    }
  }
}
