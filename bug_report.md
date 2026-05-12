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

## 🟡 Medium

### BUG 2 — Clock-In Page: Animation controller driven from inside `build()`

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

## 🟠 Low / Cosmetic

### BUG 3 — Profile Page: Biometric and Notifications switches are fake

**File:** `profile_page.dart` · **Lines:** 394–408

Both `Switch` widgets are hardcoded to `value: true` with `onChanged: (_) {}`. They
look interactive but do nothing. This is misleading UX — toggling them has no effect
and the state is never persisted.

**Fix:**
replace them with a static read-only indicator so users don't think they're changing something.
