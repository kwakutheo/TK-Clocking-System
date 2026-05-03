# TK Clocking System

> **Ghana-Ready Workforce Time & Attendance SaaS**
>
> Flutter mobile app · NestJS REST API · Next.js Admin Dashboard · PostgreSQL

---

## 📦 Monorepo Structure

```
tk_clocking_system/
├── lib/                     # Flutter mobile app (employee-facing)
├── backend/                 # NestJS REST API
│   ├── src/
│   │   ├── common/enums/    # Shared enums (UserRole, AttendanceType…)
│   │   ├── modules/
│   │   │   ├── auth/        # JWT + RBAC
│   │   │   ├── users/       # User accounts
│   │   │   ├── employees/   # Employee profiles
│   │   │   ├── attendance/  # Clock-in/out, GPS fence, offline sync
│   │   │   ├── branches/    # Physical locations + geofence radius
│   │   │   ├── departments/ # Org chart
│   │   │   ├── shifts/      # Working schedules
│   │   │   └── leave/       # Leave request workflow
│   │   └── database/seed.ts # Sample data seeder
│   └── Dockerfile
├── docker-compose.yml       # Full stack: Postgres + API
├── .env.example             # Environment template
└── md_files/                # Architecture documentation
```

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (for mobile)

### 1. Clone and configure environment

```bash
# Copy the environment template
cp .env.example .env
# Edit .env — change JWT secrets before deploying to production
```

### 2. Start the full backend stack

```bash
docker compose up --build -d
```

This starts:
| Service | URL |
|---|---|
| NestJS API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/api/docs |
| PostgreSQL | localhost:5432 |
| HR Dashboard | http://localhost:3001 |

> Add `--profile tools` to also start pgAdmin at http://localhost:5050

### 3. Seed the database

```bash
cd backend
npm run seed
```

This creates sample users with these credentials:

| Role        | Email                | Password        |
| ----------- | -------------------- | --------------- |
| Super Admin | kwame@tkclocking.dev | Admin@1234      |
| HR Admin    | abena@tkclocking.dev | HrAdmin@1234    |
| Supervisor  | kofi@tkclocking.dev  | Supervisor@1234 |
| Employee    | ama@tkclocking.dev   | Employee@1234   |
| Employee    | yaw@tkclocking.dev   | Employee@1234   |

### 4. Run the Flutter app

```bash
# Start an Android emulator or connect a device
flutter pub get
flutter run
```

> The app targets `10.0.2.2:3000` by default (Android emulator → host machine). Change `AppConstants.baseUrl` for a real device or production.

---

## 🛠 Local Backend Development (no Docker)

```bash
cd backend

# Install dependencies
npm install

# Start PostgreSQL locally (or use Docker just for Postgres)
docker compose up postgres -d

# Copy env
cp .env.example .env

# Run in watch mode
npm run start:dev

# Seed
npm run seed
```

---

## 🔑 API Authentication

All protected endpoints require a Bearer token:

```http
Authorization: Bearer <access_token>
```

Get a token via `POST /api/v1/auth/login`:

```json
{
  "identifier": "ama@tkclocking.dev",
  "password": "Employee@1234"
}
```

Response:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "...", "role": "employee", ... }
}
```

---

## 🗺 Key API Endpoints

| Method | Path                   | Auth        | Description        |
| ------ | ---------------------- | ----------- | ------------------ |
| POST   | `/auth/login`          | Public      | Login              |
| POST   | `/auth/register`       | Public      | Register           |
| GET    | `/auth/me`             | Any         | Current user       |
| POST   | `/attendance/clock-in` | Any         | Record event       |
| POST   | `/attendance/sync`     | Any         | Batch offline sync |
| GET    | `/attendance/history`  | Any         | Own history        |
| GET    | `/attendance/live`     | Supervisor+ | Today's feed       |
| GET    | `/employees`           | Supervisor+ | All employees      |
| PATCH  | `/leave/:id/approve`   | Supervisor+ | Approve leave      |

Full interactive docs → **http://localhost:3000/api/docs**

---

## 🔒 RBAC Matrix

| Endpoint type    | employee | supervisor | hr_admin | super_admin |
| ---------------- | :------: | :--------: | :------: | :---------: |
| Clock in/out     |    ✅    |     ✅     |    ✅    |     ✅      |
| Own history      |    ✅    |     ✅     |    ✅    |     ✅      |
| Live attendance  |    ❌    |     ✅     |    ✅    |     ✅      |
| Manage employees |    ❌    |     ❌     |    ✅    |     ✅      |
| Approve leave    |    ❌    |     ✅     |    ✅    |     ✅      |
| Delete records   |    ❌    |     ❌     |    ❌    |     ✅      |

---

## 🌍 Offline-First Architecture

```
Employee clocks in (no internet)
  → Flutter saves to Hive with SyncStatus.pending
  → ConnectivityService detects reconnection
  → AttendanceSyncEvent fired automatically
  → POST /attendance/sync → backend reconciles batch
  → Duplicates within 1 min silently skipped
```

---

## ⚙️ Environment Variables

| Variable                 | Default        | Description              |
| ------------------------ | -------------- | ------------------------ |
| `PORT`                   | 3000           | API port                 |
| `DB_HOST`                | localhost      | Postgres host            |
| `DB_PORT`                | 5432           | Postgres port            |
| `DB_USER`                | postgres       | DB username              |
| `DB_PASS`                | postgres       | DB password              |
| `DB_NAME`                | tk_clocking    | Database name            |
| `JWT_SECRET`             | —              | **Change in production** |
| `JWT_EXPIRES_IN`         | 8h             | Access token TTL         |
| `JWT_REFRESH_SECRET`     | —              | **Change in production** |
| `JWT_REFRESH_EXPIRES_IN` | 7d             | Refresh token TTL        |
| `CORS_ORIGIN`            | localhost:3001 | Next.js dashboard URL    |

---

## 📋 Tech Stack

| Layer                | Technology                                        |
| -------------------- | ------------------------------------------------- |
| Mobile               | Flutter 3 · flutter_bloc · go_router · Hive · Dio |
| Backend              | NestJS · TypeORM · Passport JWT · class-validator |
| Database             | PostgreSQL 16                                     |
| Auth                 | JWT (access + refresh) · bcrypt (12 rounds)       |
| Containerisation     | Docker · Docker Compose                           |
| Dashboard _(coming)_ | Next.js · Zustand                                 |
