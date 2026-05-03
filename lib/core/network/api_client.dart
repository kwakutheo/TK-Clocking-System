import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import 'package:tk_clocking_system/core/constants/app_constants.dart';
import 'package:tk_clocking_system/core/services/storage_service.dart';

/// Configured [Dio] HTTP client for all backend communication.
///
/// Automatically attaches the JWT Bearer token to every request and
/// handles 401 responses by clearing the session.
class ApiClient {
  ApiClient({required StorageService storage}) : _storage = storage {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.addAll([
      _authInterceptor(),
      PrettyDioLogger(
        requestHeader: false,
        requestBody: true,
        responseBody: true,
        compact: true,
      ),
    ]);
  }

  late final Dio _dio;
  final StorageService _storage;

  Dio get dio => _dio;

  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }

  // ── Auth interceptor ──────────────────────────────────────────────────────
  InterceptorsWrapper _authInterceptor() => InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await _storage.clearSession();
          }
          handler.next(error);
        },
      );

  // ── HTTP helpers ──────────────────────────────────────────────────────────
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) =>
      _dio.get<T>(path, queryParameters: queryParameters);

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
  }) =>
      _dio.post<T>(path, data: data);

  Future<Response<T>> put<T>(
    String path, {
    Object? data,
  }) =>
      _dio.put<T>(path, data: data);

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
  }) =>
      _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);
}
