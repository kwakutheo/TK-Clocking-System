import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tk_clocking_system/core/constants/app_constants.dart';
import 'package:tk_clocking_system/core/network/api_client.dart';
import 'package:tk_clocking_system/core/services/connectivity_service.dart';
import 'package:tk_clocking_system/core/services/location_service.dart';
import 'package:tk_clocking_system/core/services/storage_service.dart';
import 'package:tk_clocking_system/core/services/biometric_service.dart';
import 'package:tk_clocking_system/core/services/notification_service.dart';
import 'package:tk_clocking_system/features/attendance/data/repositories/attendance_repository_impl.dart';
import 'package:tk_clocking_system/features/attendance/domain/repositories/attendance_repository.dart';
import 'package:tk_clocking_system/features/attendance/domain/usecases/get_attendance_history_usecase.dart';
import 'package:tk_clocking_system/features/attendance/domain/usecases/qr_clock_usecase.dart';
import 'package:tk_clocking_system/features/attendance/domain/usecases/record_attendance_usecase.dart';
import 'package:tk_clocking_system/features/attendance/domain/usecases/sync_pending_attendance_usecase.dart';
import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_bloc.dart';
import 'package:tk_clocking_system/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:tk_clocking_system/features/auth/domain/repositories/auth_repository.dart';
import 'package:tk_clocking_system/features/auth/domain/usecases/get_cached_user_usecase.dart';
import 'package:tk_clocking_system/features/auth/domain/usecases/login_usecase.dart';
import 'package:tk_clocking_system/features/auth/domain/usecases/logout_usecase.dart';
import 'package:tk_clocking_system/features/auth/domain/usecases/sync_profile_usecase.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_bloc.dart';

/// Global service locator.
final GetIt sl = GetIt.instance;

/// Bootstraps and registers all dependencies.
///
/// Call this once in [main] before [runApp].
Future<void> init() async {
  // ── External ─────────────────────────────────────────────────────────────
  await _initHive();

  final sharedPrefs = await SharedPreferences.getInstance();
  sl.registerLazySingleton<SharedPreferences>(() => sharedPrefs);

  sl.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  );

  sl.registerLazySingleton<Connectivity>(() => Connectivity());

  sl.registerLazySingleton<ConnectivityService>(
    () => ConnectivityService(sl<Connectivity>()),
  );

  // ── Core services ─────────────────────────────────────────────────────────
  sl.registerLazySingleton<StorageService>(
    () => StorageService(
      prefs: sl<SharedPreferences>(),
      secureStorage: sl<FlutterSecureStorage>(),
    ),
  );

  sl.registerLazySingleton<ApiClient>(
    () => ApiClient(storage: sl<StorageService>()),
  );
  sl.registerLazySingleton<NotificationService>(() => NotificationService());

  sl.registerLazySingleton<LocationService>(() => LocationService());
  sl.registerLazySingleton<BiometricService>(() => BiometricService());

  // ── Auth ─────────────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      apiClient: sl<ApiClient>(),
      storage: sl<StorageService>(),
    ),
  );

  sl.registerLazySingleton(() => LoginUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton(() => LogoutUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton(() => GetCachedUserUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton(() => SyncProfileUseCase(sl<AuthRepository>()));

  sl.registerFactory(
    () => AuthBloc(
      loginUseCase: sl<LoginUseCase>(),
      logoutUseCase: sl<LogoutUseCase>(),
      getCachedUserUseCase: sl<GetCachedUserUseCase>(),
      syncProfileUseCase: sl<SyncProfileUseCase>(),
    ),
  );

  // ── Attendance ────────────────────────────────────────────────────────────
  sl.registerLazySingleton<AttendanceRepository>(
    () => AttendanceRepositoryImpl(
      apiClient: sl<ApiClient>(),
      connectivity: sl<Connectivity>(),
    ),
  );

  sl.registerLazySingleton(
    () => RecordAttendanceUseCase(sl<AttendanceRepository>()),
  );
  sl.registerLazySingleton(
    () => GetAttendanceHistoryUseCase(sl<AttendanceRepository>()),
  );
  sl.registerLazySingleton(
    () => SyncPendingAttendanceUseCase(sl<AttendanceRepository>()),
  );
  sl.registerLazySingleton(
    () => QrClockUseCase(sl<AttendanceRepository>()),
  );

  sl.registerFactory(
    () => AttendanceBloc(
      recordAttendance: sl<RecordAttendanceUseCase>(),
      getHistory: sl<GetAttendanceHistoryUseCase>(),
      syncPending: sl<SyncPendingAttendanceUseCase>(),
      qrClock: sl<QrClockUseCase>(),
      locationService: sl<LocationService>(),
    ),
  );
}

// ── Hive initialisation ───────────────────────────────────────────────────────
Future<void> _initHive() async {
  await Hive.initFlutter();
  await Hive.openBox<Map>(AppConstants.attendanceBox);
  await Hive.openBox<Map>(AppConstants.userBox);
}
