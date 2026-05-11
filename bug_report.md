# TK Clocking System — Mobile App Bug Report

---

## 🔴 Critical

### BUG 1 — Profile Page: Text controllers reset while the user is typing
**File:** `profile_page.dart` · **Lines:** 40–47

`_fullNameController`, `_usernameController`, and the password controllers are all
initialized inside `didChangeDependencies()`. This lifecycle method is called **every
time an ancestor `InheritedWidget` changes** — including every time `AuthBloc` emits a
new `AuthAuthenticated` state (which happens on any background profile sync or
`AuthCheckSessionEvent`).

**Effect:** If the user opens the edit form and the background sync fires while they're
mid-typing, their controllers are re-created and all unsaved input is silently erased.

**Fix:** Move controller initialization to `initState()`:
```dart
@override
void initState() {
  super.initState();
  // Use addPostFrameCallback so context is available for reading bloc state.
  WidgetsBinding.instance.addPostFrameCallback((_) {
    final user = _currentUser;
    _fullNameController = TextEditingController(text: user?.fullName ?? '');
    _usernameController = TextEditingController(text: user?.username ?? '');
    _passwordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
  });
}
```

---

### BUG 2 — Profile Page: `_saveProfile` never sends `fullName` to the server
**File:** `profile_page.dart` · **Lines:** 69–71

The payload only includes `username` (and optionally `password`). `_fullNameController`
is initialized and disposed but the edit form has no `fullName` field and nothing sends
it. Any full-name change is silently discarded.

**Fix:** Either add a full-name `AppTextField` to the edit form and include it in the
payload, or remove `_fullNameController` entirely to avoid confusion.

---

## 🟡 Medium

### BUG 3 — Clock-In Page: Animation controller driven from inside `build()`
**File:** `clock_in_page.dart` · **Lines:** 272–274

```dart
_pulseController
    .forward(from: 0)
    .then((_) => _pulseController.reverse());
```

This runs **inside the `StreamBuilder` builder function**, which executes during the
Flutter build phase. Calling `forward()` from `build()` is a known Flutter anti-pattern.
It can trigger `markNeedsBuild` during an active build pass, causing assertion errors
in debug builds and stuttering in release builds.

**Fix:** Drive the pulse from a `Timer` or `Stream.listen` inside `initState`:
```dart
Stream.periodic(const Duration(seconds: 1)).listen((_) {
  if (mounted) _pulseController.forward(from: 0).then((_) => _pulseController.reverse());
});
```

---

### BUG 4 — Clock-In Page: QR button hardcoded to `Colors.purple`
**File:** `clock_in_page.dart` · **Line:** 649

The "Scan QR Code" button color was accidentally changed to `Colors.purple` during a
shadow editing session. This is a hardcoded magic color that won't respect the app
theme and will look wrong on any custom theme.

**Fix:** Revert to the theme color:
```dart
color: colorScheme.primary,
```

---

### BUG 5 — Profile Page: Employee Code copy button shows a success snackbar but never copies
**File:** `profile_page.dart` · **Lines:** 372–380

There's a `// TODO: Implement copy to clipboard` comment. The UI copy icon is shown
and tapping it shows "Employee code copied to clipboard" — but `Clipboard.setData()`
is never called. This actively misleads the user.

**Fix:** Add the actual clipboard call:
```dart
onTap: () async {
  await Clipboard.setData(ClipboardData(text: user.employeeCode!));
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Employee code copied to clipboard')),
    );
  }
},
```
You'll also need `import 'package:flutter/services.dart';`.

---

## 🟠 Low / Cosmetic

### BUG 6 — Profile Page: Biometric and Notifications switches are fake
**File:** `profile_page.dart` · **Lines:** 394–408

Both `Switch` widgets are hardcoded to `value: true` with `onChanged: (_) {}`. They
look interactive but do nothing. This is misleading UX — toggling them has no effect
and the state is never persisted.

**Fix:** Either wire them to a real settings storage (e.g. `SharedPreferences`) or
replace them with a static read-only indicator if settings are not yet implemented,
so users don't think they're changing something.

---

### BUG 7 — Home Page: `_QuickActionsCard` is a transparent card
**File:** `home_page.dart` · **Lines:** 1156–1159

During shadow cleanup, the parent card was set to `color: Colors.transparent` and
`elevation: 0`. This means the 20px padding around the action buttons has no visual
container — it's just invisible whitespace. The buttons float in the layout without
any grouping affordance.

**Fix:** Either remove the `Card` entirely and put the `Row` directly in the scroll
view, or give it a proper background:
```dart
return Card(
  elevation: 0,
  clipBehavior: Clip.none,
  // remove color: Colors.transparent
);
```

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | 🔴 Critical | `profile_page.dart` | Controllers reset mid-edit in `didChangeDependencies` |
| 2 | 🔴 Critical | `profile_page.dart` | `fullName` never sent to backend on save |
| 3 | 🟡 Medium | `clock_in_page.dart` | Animation driven from inside `build()` |
| 4 | 🟡 Medium | `clock_in_page.dart` | QR button hardcoded `Colors.purple` |
| 5 | 🟡 Medium | `profile_page.dart` | Copy-to-clipboard shows message but does nothing |
| 6 | 🟠 Low | `profile_page.dart` | Biometric/Notifications switches are non-functional |
| 7 | 🟠 Low | `home_page.dart` | Quick actions card is fully transparent |
