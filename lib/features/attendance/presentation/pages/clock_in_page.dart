import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_bloc.dart';
import 'package:tk_clocking_system/features/attendance/presentation/pages/qr_scan_page.dart';
import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_event.dart';
import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_state.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_state.dart';
import 'package:tk_clocking_system/shared/enums/attendance_type.dart';
import 'package:tk_clocking_system/shared/enums/sync_status.dart';
import 'package:tk_clocking_system/core/di/injection_container.dart';
import 'package:tk_clocking_system/core/services/biometric_service.dart';

/// The main clock-in / clock-out screen for employees.
class ClockInPage extends StatelessWidget {
  const ClockInPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: BlocConsumer<AttendanceBloc, AttendanceState>(
        listener: (context, state) {
          if (state is AttendanceRecorded) {
            final isOffline = state.record.syncStatus == SyncStatus.pending;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isOffline
                      ? '${_label(state.record.type)} saved offline — will sync when connected.'
                      : '${_label(state.record.type)} recorded successfully!',
                ),
                backgroundColor: isOffline
                    ? Colors.orange.shade700
                    : Theme.of(context).colorScheme.primary,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            );
          } else if (state is AttendanceEarlyClockOutWarning) {
            showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                icon: const Icon(Icons.access_time_rounded,
                    size: 40, color: Colors.orange),
                title: const Text('Clock Out Early?'),
                content: Text(state.message),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(false),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    style: FilledButton.styleFrom(
                        backgroundColor: Colors.orange),
                    onPressed: () => Navigator.of(ctx).pop(true),
                    child: const Text('Clock Out Anyway'),
                  ),
                ],
              ),
            ).then((confirmed) {
              if (confirmed == true && context.mounted) {
                if (state.pendingQrCode != null) {
                  context.read<AttendanceBloc>().add(
                        AttendanceQrRecordEvent(
                          qrCode: state.pendingQrCode!,
                          type: state.pendingType,
                          forceEarlyOut: true,
                        ),
                      );
                } else {
                  context.read<AttendanceBloc>().add(
                        AttendanceRecordEvent(
                          employeeId: state.pendingEmployeeId,
                          type: state.pendingType,
                          branchId: state.pendingBranchId,
                          deviceId: state.pendingDeviceId,
                          forceEarlyOut: true,
                        ),
                      );
                }
              }
            });
          } else if (state is AttendanceFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        builder: (context, state) {
          final authState = context.read<AuthBloc>().state;
          final user = authState is AuthAuthenticated ? authState.user : null;
          final isLoading = state is AttendanceLoading;

          return Stack(
            children: [
              SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _ClockDisplay(),
                      const SizedBox(height: 40),
                      _StatusCard(userName: user?.fullName ?? ''),
                      const SizedBox(height: 24),
                      Text(
                        'Actions',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 16),
                      _ActionGrid(
                        employeeId: user?.id ?? '',
                        isLoading: isLoading,
                      ),
                      const SizedBox(height: 24),
                      _QrScanButton(
                        isLoading: isLoading,
                      ),
                    ],
                  ),
                ),
              ),
              if (isLoading) const _LoadingOverlay(),
            ],
          );
        },
      ),
    );
  }

  String _label(AttendanceType type) => switch (type) {
        AttendanceType.clockIn => 'Clock In',
        AttendanceType.clockOut => 'Clock Out',
        AttendanceType.breakIn => 'Break Start',
        AttendanceType.breakOut => 'Break End',
      };
}

// ── Live clock display ────────────────────────────────────────────────────────
class _ClockDisplay extends StatefulWidget {
  @override
  State<_ClockDisplay> createState() => _ClockDisplayState();
}

class _ClockDisplayState extends State<_ClockDisplay> {
  late final Stream<DateTime> _clock;

  @override
  void initState() {
    super.initState();
    _clock = Stream.periodic(
      const Duration(seconds: 1),
      (_) => DateTime.now(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return StreamBuilder<DateTime>(
      stream: _clock,
      initialData: DateTime.now(),
      builder: (context, snapshot) {
        final now = snapshot.data!;
        final timeStr =
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
        final dateStr =
            '${_weekday(now.weekday)}, ${now.day} ${_month(now.month)} ${now.year}';
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              timeStr,
              style: theme.textTheme.displayMedium?.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: -2,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              dateStr,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        );
      },
    );
  }

  String _weekday(int d) => const [
        '',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ][d];

  String _month(int m) => const [
        '',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ][m];
}

// ── Status card ───────────────────────────────────────────────────────────────
class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: colorScheme.primaryContainer,
              child: Text(
                userName.isNotEmpty ? userName[0].toUpperCase() : '?',
                style: TextStyle(
                  color: colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                  fontSize: 20,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  userName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Action grid ───────────────────────────────────────────────────────────────
class _ActionGrid extends StatelessWidget {
  const _ActionGrid({required this.employeeId, required this.isLoading});

  final String employeeId;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final actions = [
      (AttendanceType.clockIn, Icons.login_rounded, 'Clock In', Colors.green),
      (AttendanceType.clockOut, Icons.logout_rounded, 'Clock Out', Colors.red),
      (
        AttendanceType.breakIn,
        Icons.free_breakfast_rounded,
        'Break Start',
        Colors.orange
      ),
      (AttendanceType.breakOut, Icons.replay_rounded, 'Break End', Colors.blue),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.4,
      children: actions.map((action) {
        final (type, icon, label, color) = action;
        return _ActionTile(
          type: type,
          icon: icon,
          label: label,
          color: color,
          employeeId: employeeId,
          isLoading: isLoading,
        );
      }).toList(),
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.type,
    required this.icon,
    required this.label,
    required this.color,
    required this.employeeId,
    required this.isLoading,
  });

  final AttendanceType type;
  final IconData icon;
  final String label;
  final Color color;
  final String employeeId;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: isLoading
          ? null
          : () async {
              final confirmed = await _showConfirmDialog(context, label, icon, color);
              if (confirmed == true && context.mounted) {
                // Biometric/PIN Verification
                final biometricService = sl<BiometricService>();
                if (await biometricService.isBiometricAvailable()) {
                  final authenticated = await biometricService.authenticate(
                    'Please verify your identity to $label',
                  );
                  if (!authenticated) return;
                }

                if (context.mounted) {
                  context.read<AttendanceBloc>().add(
                        AttendanceRecordEvent(
                          employeeId: employeeId,
                          type: type,
                        ),
                      );
                }
              }
            },
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          border: Border.all(color: color.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── QR Scan Button ──────────────────────────────────────────────────────────
class _QrScanButton extends StatelessWidget {
  const _QrScanButton({required this.isLoading});

  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: isLoading
          ? null
          : () async {
              final qrCode = await Navigator.of(context).push<String>(
                MaterialPageRoute(
                  builder: (_) => const QrScanPage(),
                ),
              );
              if (qrCode != null && qrCode.isNotEmpty && context.mounted) {
                _showTypeSelector(context, qrCode);
              }
            },
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        decoration: BoxDecoration(
          color: colorScheme.primaryContainer,
          border: Border.all(color: colorScheme.primary.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.qr_code_scanner_rounded,
              color: colorScheme.primary,
              size: 24,
            ),
            const SizedBox(width: 12),
            Text(
              'Scan QR Code',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTypeSelector(BuildContext context, String qrCode) {
    final bloc = context.read<AttendanceBloc>();
    final colorScheme = Theme.of(context).colorScheme;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select Action',
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'QR code detected. What would you like to record?',
                  style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 20),
                _QrTypeTile(
                  icon: Icons.login_rounded,
                  label: 'Clock In',
                  color: Colors.green,
                  onTap: () async {
                    final confirmed = await _showConfirmDialog(ctx, 'Clock In', Icons.login_rounded, Colors.green);
                    if (confirmed == true && context.mounted) {
                      // Biometric/PIN Verification
                      final biometricService = sl<BiometricService>();
                      if (await biometricService.isBiometricAvailable()) {
                        final authenticated = await biometricService.authenticate(
                          'Please verify your identity to Clock In',
                        );
                        if (!authenticated) return;
                      }

                      if (context.mounted) {
                        Navigator.pop(ctx);
                        bloc.add(
                          AttendanceQrRecordEvent(
                            qrCode: qrCode,
                            type: AttendanceType.clockIn,
                          ),
                        );
                      }
                    }
                  },
                ),
                const SizedBox(height: 8),
                _QrTypeTile(
                  icon: Icons.logout_rounded,
                  label: 'Clock Out',
                  color: Colors.red,
                  onTap: () async {
                    final confirmed = await _showConfirmDialog(ctx, 'Clock Out', Icons.logout_rounded, Colors.red);
                    if (confirmed == true && context.mounted) {
                      // Biometric/PIN Verification
                      final biometricService = sl<BiometricService>();
                      if (await biometricService.isBiometricAvailable()) {
                        final authenticated = await biometricService.authenticate(
                          'Please verify your identity to Clock Out',
                        );
                        if (!authenticated) return;
                      }

                      if (context.mounted) {
                        Navigator.pop(ctx);
                        bloc.add(
                          AttendanceQrRecordEvent(
                            qrCode: qrCode,
                            type: AttendanceType.clockOut,
                          ),
                        );
                      }
                    }
                  },
                ),
                const SizedBox(height: 8),
                _QrTypeTile(
                  icon: Icons.free_breakfast_rounded,
                  label: 'Break Start',
                  color: Colors.orange,
                  onTap: () async {
                    final confirmed = await _showConfirmDialog(ctx, 'Break Start', Icons.free_breakfast_rounded, Colors.orange);
                    if (confirmed == true && context.mounted) {
                      // Biometric/PIN Verification
                      final biometricService = sl<BiometricService>();
                      if (await biometricService.isBiometricAvailable()) {
                        final authenticated = await biometricService.authenticate(
                          'Please verify your identity to record Break Start',
                        );
                        if (!authenticated) return;
                      }

                      if (context.mounted) {
                        Navigator.pop(ctx);
                        bloc.add(
                          AttendanceQrRecordEvent(
                            qrCode: qrCode,
                            type: AttendanceType.breakIn,
                          ),
                        );
                      }
                    }
                  },
                ),
                const SizedBox(height: 8),
                _QrTypeTile(
                  icon: Icons.replay_rounded,
                  label: 'Break End',
                  color: Colors.blue,
                  onTap: () async {
                    final confirmed = await _showConfirmDialog(ctx, 'Break End', Icons.replay_rounded, Colors.blue);
                    if (confirmed == true && context.mounted) {
                      // Biometric/PIN Verification
                      final biometricService = sl<BiometricService>();
                      if (await biometricService.isBiometricAvailable()) {
                        final authenticated = await biometricService.authenticate(
                          'Please verify your identity to record Break End',
                        );
                        if (!authenticated) return;
                      }

                      if (context.mounted) {
                        Navigator.pop(ctx);
                        bloc.add(
                          AttendanceQrRecordEvent(
                            qrCode: qrCode,
                            type: AttendanceType.breakOut,
                          ),
                        );
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _QrTypeTile extends StatelessWidget {
  const _QrTypeTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Ink(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 16),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const Spacer(),
            Icon(
              Icons.arrow_forward_ios_rounded,
              color: color.withValues(alpha: 0.5),
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}
// ── Helper Methods ─────────────────────────────────────────────────────────
Future<bool?> _showConfirmDialog(
  BuildContext context,
  String label,
  IconData icon,
  Color color,
) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      icon: Icon(icon, color: color, size: 40),
      title: Text('Confirm $label'),
      content: Text('Are you sure you want to record a $label?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: color),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text('Confirm $label'),
        ),
      ],
    ),
  );
}

// ── Loading Overlay ─────────────────────────────────────────────────────────
class _LoadingOverlay extends StatelessWidget {
  const _LoadingOverlay();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.3),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                'Processing...',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
