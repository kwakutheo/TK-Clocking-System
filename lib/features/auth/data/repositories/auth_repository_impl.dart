import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:dartz/dartz.dart';

import 'package:tk_clocking_system/core/errors/failures.dart';
import 'package:tk_clocking_system/core/network/api_client.dart';
import 'package:tk_clocking_system/core/network/api_endpoints.dart';
import 'package:tk_clocking_system/core/services/storage_service.dart';
import 'package:tk_clocking_system/features/auth/data/models/user_model.dart';
import 'package:tk_clocking_system/features/auth/domain/entities/login_result.dart';
import 'package:tk_clocking_system/features/auth/domain/entities/user_entity.dart';
import 'package:tk_clocking_system/features/auth/domain/repositories/auth_repository.dart';

/// Concrete implementation of [AuthRepository].
class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({
    required ApiClient apiClient,
    required StorageService storage,
  })  : _api = apiClient,
        _storage = storage;

  final ApiClient _api;
  final StorageService _storage;

  @override
  Future<Either<Failure, LoginResult>> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await _api.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {'identifier': username, 'password': password},
      );

      final data = response.data!;
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);

      await _storage.saveAccessToken(data['access_token'] as String);
      await _storage.saveRefreshToken(data['refresh_token'] as String);
      await _storage.saveUserJson(user.toJsonString());

      // Cache credentials hash for offline login fallback
      final identifier = username.trim().toLowerCase();
      await _storage.saveOfflineIdentifier(identifier);
      await _storage.saveOfflinePasswordHash(_hashPassword(password));

      return Right(LoginResult(user: user));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        return const Left(InvalidCredentialsFailure());
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return await _tryOfflineLogin(username, password);
      }
      if (e.type == DioExceptionType.connectionError) {
        return await _tryOfflineLogin(username, password);
      }
      return Left(ServerFailure(e.message ?? 'Server error.'));
    } catch (_) {
      return const Left(ServerFailure());
    }
  }

  // ── Offline login fallback ────────────────────────────────────────────────
  Future<Either<Failure, LoginResult>> _tryOfflineLogin(
    String username,
    String password,
  ) async {
    final cachedIdentifier = _storage.getOfflineIdentifier();
    final cachedHash = _storage.getOfflinePasswordHash();
    final cachedUserJson = _storage.getUserJson();

    if (cachedIdentifier == null ||
        cachedHash == null ||
        cachedUserJson == null) {
      return const Left(
        NetworkFailure(
          'No internet connection. Please connect and sign in at least once.',
        ),
      );
    }

    final identifier = username.trim().toLowerCase();
    if (identifier != cachedIdentifier ||
        _hashPassword(password) != cachedHash) {
      return const Left(
        InvalidCredentialsFailure(
          'Invalid username or password (offline mode).',
        ),
      );
    }

    final user = UserModel.fromJsonString(cachedUserJson);
    return Right(LoginResult(user: user, isOffline: true));
  }

  String _hashPassword(String password) {
    final bytes = utf8.encode(password);
    return sha256.convert(bytes).toString();
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await _storage.clearSession();
      await _storage.clearOfflineCredentials();
      return const Right(null);
    } catch (_) {
      return const Left(CacheFailure());
    }
  }

  @override
  Future<Either<Failure, UserEntity?>> getCachedUser() async {
    try {
      final json = _storage.getUserJson();
      if (json == null) return const Right(null);
      return Right(UserModel.fromJsonString(json));
    } catch (_) {
      return const Left(CacheFailure());
    }
  }

  @override
  Future<Either<Failure, UserEntity>> syncProfile() async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        ApiEndpoints.employeeMe,
      );
      final data = response.data!;
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>? ?? data);
      await _storage.saveUserJson(user.toJsonString());
      return Right(user);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        return const Left(InvalidCredentialsFailure());
      }
      return Left(ServerFailure(e.message ?? 'Server error.'));
    } catch (_) {
      return const Left(ServerFailure());
    }
  }
}
