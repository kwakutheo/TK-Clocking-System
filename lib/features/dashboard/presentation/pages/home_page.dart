import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:visibility_detector/visibility_detector.dart';
import 'package:intl/intl.dart';
import 'package:tk_clocking_system/core/constants/app_constants.dart';
import 'package:tk_clocking_system/core/di/injection_container.dart';
import 'package:tk_clocking_system/features/attendance/domain/repositories/attendance_repository.dart';
import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_bloc.dart';
import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_event.dart';
import 'package:tk_clocking_system/features/attendance/presentation/bloc/attendance_state.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_event.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_state.dart';
import 'package:tk_clocking_system/features/dashboard/domain/entities/home_data_entity.dart';
// LateStatus enum is defined in home_data_entity.dart
import 'package:tk_clocking_system/features/profile/presentation/pages/profile_page.dart';
import 'package:tk_clocking_system/features/attendance/presentation/pages/history_page.dart';
import 'package:tk_clocking_system/features/attendance/presentation/pages/my_report_page.dart';
import 'package:tk_clocking_system/shared/enums/attendance_type.dart';
import 'package:tk_clocking_system/shared/enums/sync_status.dart';

/// Shell home page with bottom navigation between Attendance, History,
/// and Profile tabs.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  int _selectedIndex = 0;

  void setTab(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: const [
          _DashboardTab(),
          HistoryPage(),
          MyReportPage(),
          ProfilePage(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history_rounded),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart_rounded),
            label: 'Report',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────
class _DashboardTab extends StatefulWidget {
  const _DashboardTab();

  @override
  State<_DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<_DashboardTab> {
  late Future<HomeDataEntity> _homeDataFuture;
  int _pendingCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
    _checkPending();
  }

  void _loadData() {
    _homeDataFuture = sl<AttendanceRepository>().getHomeData().then((res) {
      return res.fold(
        (f) => throw Exception(f.message),
        (data) => data,
      );
    });
  }

  void _checkPending() {
    final box = Hive.box<Map>(AppConstants.attendanceBox);
    setState(() {
      _pendingCount = box.values.where((e) => e['sync_status'] == SyncStatus.pending.value).length;
    });
  }
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceSynced || state is AttendanceRecorded) {
          _checkPending();
        }
      },
      child: VisibilityDetector(
        key: const Key('dashboard-tab'),
        onVisibilityChanged: (info) {
          if (info.visibleFraction > 0.5) {
            _loadData();
            _checkPending();
            context.read<AuthBloc>().add(const AuthSyncProfileEvent());
          }
        },
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _loadData();
                _checkPending();
              });
              context.read<AuthBloc>().add(const AuthSyncProfileEvent());
              await _homeDataFuture;
            },
            child: CustomScrollView(
              slivers: [
              SliverAppBar(
                floating: true,
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Good ${_greeting()},',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      user?.fullName.split(' ').first ?? 'Employee',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    icon: CircleAvatar(
                      radius: 18,
                      backgroundColor: colorScheme.primaryContainer,
                      child: Text(
                        user?.initials ?? '?',
                        style: TextStyle(
                          color: colorScheme.onPrimaryContainer,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    onPressed: () {},
                  ),
                  const SizedBox(width: 8),
                ],
              ),
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    if (_pendingCount > 0)
                      _OfflineWarningBanner(
                        count: _pendingCount,
                        onSync: () {
                          context
                              .read<AttendanceBloc>()
                              .add(const AttendanceSyncEvent());
                        },
                      ),
                    if (_pendingCount > 0) const SizedBox(height: 16),
                    FutureBuilder<HomeDataEntity>(
                      future: _homeDataFuture,
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting) {
                          return const Center(
                              child: CircularProgressIndicator());
                        }
                        if (snapshot.hasError) {
                          return const Center(
                              child: Text('Failed to load data.'));
                        }
                        final data = snapshot.data;
                        if (data == null) return const SizedBox.shrink();

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _LiveStatusBanner(data: data),
                            const SizedBox(height: 16),
                            _QuickActionsCard(),
                            const SizedBox(height: 16),
                            _StatsRow(
                                todayHours: data.todayHours,
                                daysWorked: data.daysWorkedThisWeek),
                            const SizedBox(height: 16),
                            if (data.lastActivityType != null &&
                                data.lastActivityTime != null)
                              _LastActivitySnippet(
                                  type: data.lastActivityType!,
                                  time: data.lastActivityTime!),
                            const SizedBox(height: 16),
                          ],
                        );
                      },
                    ),
                  ]),
                ),
              ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }
}

class _OfflineWarningBanner extends StatelessWidget {
  final int count;
  final VoidCallback onSync;

  const _OfflineWarningBanner({required this.count, required this.onSync});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onSync,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.orange.withValues(alpha: 0.1),
          border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.orange),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'You have $count pending offline record(s). Tap to sync.',
                style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LiveStatusBanner extends StatelessWidget {
  final HomeDataEntity data;

  const _LiveStatusBanner({required this.data});

  @override
  Widget build(BuildContext context) {
    // ── Forgot to clock out (shift ended > 1h ago, still clocked in) ────────
    if (data.forgotToClockOut) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red.shade50.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.red.withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Forgot to Clock Out?',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: Colors.red.shade800,
                        ),
                  ),
                  Text(
                    'It looks like you never clocked out. Please do so immediately.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.red.shade900,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // ── Late banners — only shown during active shift hours ──────────────────
    if (data.lateStatus == LateStatus.persistentLate) {
      // > 3 hours late: escalated, deep-orange urgent alert
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.deepOrange.shade50.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.deepOrange.withValues(alpha: 0.6)),
        ),
        child: Row(
          children: [
            const Icon(Icons.running_with_errors_rounded, color: Colors.deepOrange, size: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Still Not Clocked In',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: Colors.deepOrange.shade800,
                        ),
                  ),
                  Text(
                    'Please make sure you clock in — your attendance is at risk.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.deepOrange.shade900,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (data.lateStatus == LateStatus.late) {
      // < 3 hours late: standard orange warning
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange.shade50.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            const Icon(Icons.access_time_filled_rounded, color: Colors.orange, size: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'You are Late!',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: Colors.orange.shade800,
                        ),
                  ),
                  Text(
                    'Please clock in as soon as possible.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.orange.shade900,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final isClockedIn = data.isClockedIn;

    if (isClockedIn) {
      String subtitle = 'Start your shift when you arrive';
      if (data.clockedInTime != null) {
        final hours = data.todayHours.floor();
        final mins = ((data.todayHours - hours) * 60).round();
        subtitle = 'Shift duration: ${hours}h ${mins}m';
      }
      return _buildBanner(
        context,
        color: Colors.green,
        icon: Icons.check_circle_rounded,
        title: 'Currently Clocked In',
        subtitle: subtitle,
      );
    }

    if (data.todayHours > 0) {
      return _buildBanner(
        context,
        color: Colors.blueGrey,
        icon: Icons.done_all_rounded,
        title: 'Shift Completed',
        subtitle: 'You worked ${data.todayHours.toStringAsFixed(1)}h today.',
      );
    }

    if (data.isVacation) {
      return _buildBanner(
        context,
        color: Colors.teal,
        icon: Icons.beach_access_rounded,
        title: data.vacationName ?? 'Vacation',
        subtitle: 'Enjoy your break!',
      );
    }

    if (data.isHoliday) {
      return _buildBanner(
        context,
        color: Colors.blue,
        icon: Icons.celebration_rounded,
        title: data.holidayName ?? 'Public Holiday',
        subtitle: 'Enjoy your day off!',
      );
    }

    if (data.isWeekend) {
      return _buildBanner(
        context,
        color: Colors.indigo,
        icon: Icons.weekend_rounded,
        title: 'Weekend',
        subtitle: 'Have a great weekend!',
      );
    }

    // Shift has ended and employee was absent — show a neutral info banner
    if (data.isAbsentToday) {
      return _buildBanner(
        context,
        color: Colors.grey,
        icon: Icons.history_toggle_off_rounded,
        title: 'Shift Ended',
        subtitle: 'You did not clock in today.',
      );
    }

    // Shift is not yet over — employee hasn't arrived yet
    return _buildBanner(
      context,
      color: Colors.red,
      icon: Icons.cancel_rounded,
      title: 'Not Clocked In Today',
      subtitle: 'Start your shift when you arrive',
    );
  }

  Widget _buildBanner(BuildContext context, {required Color color, required IconData icon, required String title, required String subtitle}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: color,
                      ),
                ),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: color.withValues(alpha: 0.8),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LastActivitySnippet extends StatelessWidget {
  final AttendanceType type;
  final DateTime time;

  const _LastActivitySnippet({required this.type, required this.time});

  @override
  Widget build(BuildContext context) {
    String label = 'Clocked In';
    if (type == AttendanceType.clockOut) {
      label = 'Clocked Out';
    } else if (type == AttendanceType.breakIn) {
      label = 'Started Break';
    } else if (type == AttendanceType.breakOut) {
      label = 'Ended Break';
    }

    final formatter = DateFormat('EEE, d MMM • h:mm a');

    return Center(
      child: Text(
        'Last Action: $label at ${formatter.format(time)}',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
    );
  }
}

// ── Quick actions card ────────────────────────────────────────────────────────
class _QuickActionsCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: _QuickAction(
                    label: 'Clock In',
                    icon: Icons.login_rounded,
                    color: Colors.green,
                    onTap: () => context.go('/home/clock-in'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    label: 'History',
                    icon: Icons.history_rounded,
                    color: colorScheme.primary,
                    onTap: () {
                      context.findAncestorStateOfType<HomePageState>()?.setTab(1);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _QuickAction(
                    label: 'Report',
                    icon: Icons.analytics_rounded,
                    color: Colors.orange,
                    onTap: () {
                      context.findAncestorStateOfType<HomePageState>()?.setTab(2);
                    },
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

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Ink(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          border: Border.all(color: color.withValues(alpha: 0.25)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
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

// ── Stats row ─────────────────────────────────────────────────────────────────
class _StatsRow extends StatelessWidget {
  final double todayHours;
  final int daysWorked;

  const _StatsRow({required this.todayHours, required this.daysWorked});

  @override
  Widget build(BuildContext context) {
    final tHours = todayHours.floor();
    final tMins = ((todayHours - tHours) * 60).round();
    final todayStr = tMins > 0 ? '${tHours}h ${tMins}m' : '${tHours}h';

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'Today',
            value: todayStr,
            icon: Icons.timer_outlined,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            label: 'This Week',
            value: '$daysWorked ${daysWorked == 1 ? 'Day' : 'Days'}',
            icon: Icons.calendar_view_week_outlined,
            color: Colors.purple,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(
                label.toUpperCase(),
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}


