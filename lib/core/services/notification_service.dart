import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:flutter/foundation.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    tz.initializeTimeZones();
    
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const initSettings = InitializationSettings(android: androidInit, iOS: iosInit);
    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        debugPrint('Notification clicked: ${details.payload}');
      },
    );
  }

  /// Schedules a one-time reminder for the end of the day.
  /// Usually called after a successful Clock In.
  Future<void> scheduleClockOutReminder({
    int hour = 17, 
    int minute = 30,
  }) async {
    try {
      final now = tz.TZDateTime.now(tz.local);
      var scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
      
      // If the time has already passed today, don't schedule for today
      if (scheduledDate.isBefore(now)) {
        return; 
      }

      await _notifications.zonedSchedule(
        101, // Unique ID for Clock Out reminders
        'Clock Out Reminder',
        "Hey! It's past your shift end. Did you forget to clock out?",
        scheduledDate,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'reminders_channel',
            'Reminders',
            channelDescription: 'Notifications for shift reminders',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
      debugPrint('Scheduled clock-out reminder for $scheduledDate');
    } catch (e) {
      debugPrint('Error scheduling notification: $e');
    }
  }

  /// Cancels any pending clock-out reminders.
  /// Usually called after a successful Clock Out.
  Future<void> cancelClockOutReminder() async {
    await _notifications.cancel(101);
    debugPrint('Cancelled clock-out reminder');
  }
}
