import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:visibility_detector/visibility_detector.dart';
import 'package:tk_clocking_system/core/di/injection_container.dart';
import 'package:tk_clocking_system/core/network/api_client.dart';
import 'package:tk_clocking_system/core/network/api_endpoints.dart';
import 'package:tk_clocking_system/core/services/storage_service.dart';
import 'package:tk_clocking_system/features/auth/data/models/user_model.dart';
import 'package:tk_clocking_system/features/auth/domain/entities/user_entity.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_event.dart';
import 'package:tk_clocking_system/features/auth/presentation/bloc/auth_state.dart';
import 'package:tk_clocking_system/shared/enums/user_role.dart';
import 'package:tk_clocking_system/shared/widgets/app_text_field.dart';
import 'package:tk_clocking_system/shared/widgets/primary_button.dart';

/// Profile tab — shows user info and allows editing.
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _isEditing = false;
  bool _isSaving = false;
  bool _isChangingPassword = false;
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _fullNameController;
  late TextEditingController _usernameController;
  late TextEditingController _passwordController;
  late TextEditingController _confirmPasswordController;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final user = _currentUser;
    _fullNameController = TextEditingController(text: user?.fullName ?? '');
    _usernameController = TextEditingController(text: user?.username ?? '');
    _passwordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  UserEntity? get _currentUser {
    final authState = context.read<AuthBloc>().state;
    return authState is AuthAuthenticated ? authState.user : null;
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final api = sl<ApiClient>();
      final payload = <String, dynamic>{
        'username': _usernameController.text.trim(),
      };
      final password = _passwordController.text.trim();
      final confirmPassword = _confirmPasswordController.text.trim();

      if (_isChangingPassword) {
        if (password != confirmPassword) {
          setState(() => _isSaving = false);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Passwords do not match'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
        payload['password'] = password;
      }

      final response = await api.patch<Map<String, dynamic>>(
        ApiEndpoints.employeeMeUpdate,
        data: payload,
      );

      final data = response.data!;
      final updatedUser = UserModel.fromJson(
        data['user'] as Map<String, dynamic>? ?? data,
      );

      // Cache updated user
      final storage = sl<StorageService>();
      await storage.saveUserJson(updatedUser.toJsonString());

      // Refresh auth bloc user
      if (mounted) {
        final authBloc = context.read<AuthBloc>();
        authBloc.add(const AuthCheckSessionEvent());
      }

      if (mounted) {
        setState(() => _isEditing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully.')),
        );
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'];
      final errorText = msg is String
          ? msg
          : msg is List
              ? msg.join(', ')
              : e.message ?? 'Failed to update profile.';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorText), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update profile: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => setState(() => _isEditing = true),
            )
          else
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => setState(() {
                _isEditing = false;
                _isChangingPassword = false;
              }),
            ),
        ],
      ),
      body: VisibilityDetector(
        key: const Key('profile-page'),
        onVisibilityChanged: (info) {
          if (info.visibleFraction > 0.5 && !_isEditing) {
            context.read<AuthBloc>().add(const AuthSyncProfileEvent());
          }
        },
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async {
              context.read<AuthBloc>().add(const AuthSyncProfileEvent());
              await Future.delayed(const Duration(seconds: 1));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                children: [
                  _ProfileHeader(user: user, theme: theme, cs: cs),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        if (user != null) ...[
                          if (_isEditing) ...[
                            Form(
                              key: _formKey,
                              child: _EditSection(
                                title: 'Edit Profile',
                                children: [
                                  AppTextField(
                                    controller: _usernameController,
                                    label: 'Username',
                                    prefixIcon: Icons.alternate_email_outlined,
                                    validator: (v) => v == null || v.isEmpty
                                        ? 'Username is required'
                                        : null,
                                  ),
                                  const SizedBox(height: 12),
                                  if (!_isChangingPassword)
                                    Center(
                                      child: TextButton.icon(
                                        onPressed: () => setState(
                                            () => _isChangingPassword = true),
                                        icon:
                                            const Icon(Icons.lock_open_rounded),
                                        label: const Text('Change Password'),
                                      ),
                                    )
                                  else ...[
                                    Row(
                                      children: [
                                        const Expanded(
                                            child: Text('Update Password',
                                                style: TextStyle(
                                                    fontWeight:
                                                        FontWeight.bold))),
                                        TextButton(
                                          onPressed: () => setState(() =>
                                              _isChangingPassword = false),
                                          child: const Text('Cancel'),
                                        ),
                                      ],
                                    ),
                                    AppTextField(
                                      controller: _passwordController,
                                      label: 'New Password',
                                      prefixIcon: Icons.lock_outline,
                                      obscureText: true,
                                      validator: (v) => v == null || v.isEmpty
                                          ? 'Password is required'
                                          : null,
                                    ),
                                    const SizedBox(height: 12),
                                    AppTextField(
                                      controller: _confirmPasswordController,
                                      label: 'Confirm New Password',
                                      prefixIcon: Icons.lock_reset_outlined,
                                      obscureText: true,
                                      validator: (v) {
                                        if (v == null || v.isEmpty) {
                                          return 'Please confirm your password';
                                        }
                                        if (v != _passwordController.text) {
                                          return 'Passwords do not match';
                                        }
                                        return null;
                                      },
                                    ),
                                  ],
                                  const SizedBox(height: 16),
                                  PrimaryButton(
                                    label: 'Save Changes',
                                    isLoading: _isSaving,
                                    onPressed: _saveProfile,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ] else ...[
                            _InfoSection(
                              title: 'Account Details',
                              items: [
                                _InfoItem(
                                  icon: Icons.alternate_email_outlined,
                                  label: 'Username',
                                  value: user.username.isNotEmpty
                                      ? user.username
                                      : '—',
                                ),
                                if (user.employeeCode != null)
                                  _InfoItem(
                                    icon: Icons.numbers_outlined,
                                    label: 'Employee Code',
                                    value: user.employeeCode!,
                                  ),
                              ],
                            ),
                            const SizedBox(height: 16),
                          ],
                        ],
                        _InfoSection(
                          title: 'App Settings',
                          items: [
                            _InfoItem(
                              icon: Icons.notifications_outlined,
                              label: 'Notifications',
                              value: 'Enabled',
                              trailing: Switch(
                                value: true,
                                onChanged: (_) {},
                              ),
                            ),
                            _InfoItem(
                              icon: Icons.gps_fixed_outlined,
                              label: 'Location Services',
                              value: 'Required for clock-in',
                              trailing: const Icon(Icons.check_circle_rounded,
                                  color: Colors.green, size: 20),
                            ),
                            _InfoItem(
                              icon: Icons.wifi_off_outlined,
                              label: 'Offline Mode',
                              value: 'Auto-sync when reconnected',
                              trailing: const Icon(Icons.check_circle_rounded,
                                  color: Colors.green, size: 20),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _InfoSection(
                          title: 'About',
                          items: [
                            _InfoItem(
                              icon: Icons.info_outlined,
                              label: 'App Version',
                              value: '1.0.0',
                            ),
                            _InfoItem(
                              icon: Icons.business_outlined,
                              label: 'Organisation',
                              value: 'TK Clocking System',
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: cs.error,
                              side: BorderSide(color: cs.error),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () => _confirmSignOut(context),
                            icon: const Icon(Icons.logout_rounded),
                            label: const Text(
                              'Sign Out',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _confirmSignOut(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              context.read<AuthBloc>().add(const AuthLogoutEvent());
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  String _roleLabel(UserRole role) {
    switch (role) {
      case UserRole.employee:
        return 'Employee';
      case UserRole.supervisor:
        return 'Supervisor';
      case UserRole.hrAdmin:
        return 'HR Admin';
      case UserRole.superAdmin:
        return 'Super Admin';
    }
  }
}

// ── Header ────────────────────────────────────────────────────────────────────
class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.user,
    required this.theme,
    required this.cs,
  });

  final UserEntity? user;
  final ThemeData theme;
  final ColorScheme cs;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            cs.primary,
            cs.primary.withValues(alpha: 0.7),
          ],
        ),
      ),
      child: Column(
        children: [
          // Avatar
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: cs.onPrimary.withValues(alpha: 0.2),
              border: Border.all(color: cs.onPrimary, width: 2.5),
            ),
            child: Center(
              child: Text(
                user?.initials ?? '?',
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: cs.onPrimary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            user?.fullName ?? 'Loading…',
            style: theme.textTheme.titleLarge?.copyWith(
              color: cs.onPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: cs.onPrimary.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              user != null ? _roleLabel(user!.role) : '',
              style: theme.textTheme.bodySmall?.copyWith(
                color: cs.onPrimary,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
          if (user?.employeeCode != null) ...[
            const SizedBox(height: 6),
            Text(
              user!.employeeCode!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: cs.onPrimary.withValues(alpha: 0.7),
                fontFamily: 'monospace',
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _roleLabel(UserRole role) {
    switch (role) {
      case UserRole.employee:
        return 'Employee';
      case UserRole.supervisor:
        return 'Supervisor';
      case UserRole.hrAdmin:
        return 'HR Admin';
      case UserRole.superAdmin:
        return 'Super Admin';
    }
  }
}

// ── Info section ──────────────────────────────────────────────────────────────
class _EditSection extends StatelessWidget {
  const _EditSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: cs.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
            ),
          ),
        ),
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: cs.outline.withValues(alpha: 0.15)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({required this.title, required this.items});

  final String title;
  final List<_InfoItem> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: cs.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
            ),
          ),
        ),
        Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: cs.outline.withValues(alpha: 0.15)),
          ),
          child: Column(
            children: [
              for (int i = 0; i < items.length; i++) ...[
                items[i],
                if (i < items.length - 1)
                  Divider(
                    height: 1,
                    indent: 52,
                    endIndent: 16,
                    color: cs.outline.withValues(alpha: 0.1),
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ── Info item ─────────────────────────────────────────────────────────────────
class _InfoItem extends StatelessWidget {
  const _InfoItem({
    required this.icon,
    required this.label,
    required this.value,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 20, color: cs.primary),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
