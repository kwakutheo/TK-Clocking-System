Listed directory tk_clocking_system
Listed directory lib
Listed directory features
Searched for "Banner"
Viewed home_page.dart:1-657
Viewed connectivity_banner.dart:1-119
Viewed app.dart:1-82

In the **TK Clocking System** mobile app, there are three main categories of banners that serve as notifications or status indicators on the home page (Dashboard):

### 1. Connectivity Banner (Global)

This banner is wrapped around the entire application and appears at the very top of the screen whenever the network status changes. It is managed by the `ConnectivityBanner` widget in `lib/shared/widgets/connectivity_banner.dart`.

- **Offline Status**: Displays "No internet connection — working offline" in an **orange** bar.
- **Online Status**: Briefly displays "Back online — syncing records…" in a **green** bar when connection is restored, then slides away.

---

### 2. Offline Sync Warning Banner

This banner appears specifically on the Dashboard tab if the app detects attendance records stored locally that haven't been synced to the server yet (common after working offline).

- **Message**: "You have X pending offline record(s). Tap to sync."
- **Visuals**: Orange background with a warning icon.
- **Action**: Tapping it triggers an immediate sync process.

---

### 3. Live Status Banner (Dynamic)

Located at the top of the Dashboard content, this banner dynamically updates based on your current attendance state and the calendar. It is implemented in `_LiveStatusBanner` within `lib/features/dashboard/presentation/pages/home_page.dart`.

The banner changes its color, icon, and message based on the following priority:

| Status                   | Message                                                          | Color/Theme               |
| :----------------------- | :--------------------------------------------------------------- | :------------------------ |
| **Forgot to Clock Out**  | "Forgot to Clock Out? You have been clocked in since yesterday." | **Red** (High Alert)      |
| **Late Today**           | "You are Late! Please clock in as soon as possible."             | **Orange** (Warning)      |
| **Currently Clocked In** | "Currently Clocked In" (shows shift duration)                    | **Green** (Success)       |
| **Shift Completed**      | "Shift Completed" (shows total hours worked)                     | **Blue-Grey** (Info)      |
| **Vacation**             | "Enjoy your break!" (displays vacation name)                     | **Teal** (Relaxed)        |
| **Public Holiday**       | "Enjoy your day off!" (displays holiday name)                    | **Blue** (Event)          |
| **Weekend**              | "Have a great weekend!"                                          | **Indigo** (Rest)         |
| **Not Clocked In**       | "Not Clocked In Today. Start your shift when you arrive."        | **Red** (Action Required) |

These banners ensure that the user is always aware of their connectivity status, pending syncs, and their current shift status at a glance.
