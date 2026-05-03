import 'package:flutter/material.dart';
import 'package:tk_clocking_system/core/services/connectivity_service.dart';

/// An animated top banner that shows the current online/offline status.
///
/// Slides down when offline, slides away when back online — stays out
/// of the way of normal app usage.
class ConnectivityBanner extends StatefulWidget {
  const ConnectivityBanner({
    super.key,
    required this.connectivityService,
    required this.child,
  });

  final ConnectivityService connectivityService;
  final Widget child;

  @override
  State<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends State<ConnectivityBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  bool _isOnline = true;

  @override
  void initState() {
    super.initState();
    _isOnline = widget.connectivityService.isOnline;

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));

    widget.connectivityService.onConnectivityChanged.listen((isOnline) {
      if (!mounted) return;
      setState(() => _isOnline = isOnline);
      if (!isOnline) {
        _controller.forward();
      } else {
        // Show "back online" briefly then hide.
        _controller.reverse().then((_) {});
      }
    });

    // Show banner immediately if already offline at startup.
    if (!_isOnline) _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SlideTransition(
          position: _slideAnimation,
          child: _BannerBar(isOnline: _isOnline),
        ),
        Expanded(child: widget.child),
      ],
    );
  }
}

class _BannerBar extends StatelessWidget {
  const _BannerBar({required this.isOnline});

  final bool isOnline;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: double.infinity,
      color: isOnline ? Colors.green.shade600 : Colors.orange.shade800,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 4,
        bottom: 8,
        left: 16,
        right: 16,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isOnline ? Icons.wifi_rounded : Icons.wifi_off_rounded,
            color: Colors.white,
            size: 16,
          ),
          const SizedBox(width: 8),
          Text(
            isOnline
                ? 'Back online — syncing records…'
                : 'No internet connection — working offline',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
