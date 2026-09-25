# Changelog

All notable changes to the Dhaka Tesla Pool project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.0.0] - 2026-09-26

### Added
- **Phase 0 — Repo Scaffold**: Monorepo structure, Docker Compose configuration (`db`, `api`, `web`), commitlint hooks, and seed scripts.
- **Phase 1 — Backend Foundation**: Initial Prisma schema with relational models (`User`, `Tesla`, `Area`, `RideRequest`, `Pool`, `PoolMembership`, `FareSnapshot`, `PoolEvent`, `Payment`), partial indexes, and uniqueness constraints.
- **Phase 2 — Auth**: BCrypt password hashing, JWT token authentication, and strict 403 role-based access middleware (`requireAuth`, `requireRole`).
- **Phase 3 — Tesla & Areas**: Deterministic inter-area Dhaka distance matrix, Tesla vehicle management with owner scoping (`GET /teslas/mine`, `PATCH /teslas/:id`).
- **Phase 4 — Ride Requests**: Ride request lifecycle with solo fare calculation (৳10 base + ৳10/km), idempotency key support, passenger-scoped retrieval, and 404 ownership guards.
- **Phase 5 — Driver Flow & Pool Lifecycle**: Pool creation by driver, strict transition state machine (`MATCHED` -> `ARRIVED` -> `STARTED` -> `COMPLETED`), fan-out status updates, and auto-cancellation on empty pool.
- **Phase 6 — Pooling, Matching, Fares & Payments**: 
  - `canJoin` corridor matching rules.
  - Raw `SELECT ... FOR UPDATE` row-level locking protecting against the last-seat concurrency race.
  - 20% locked pooled fare discount with integer paisa rounding.
  - Cash and TeslaPay wallet debit settlement on completion.
- **Phase 7 — Frontend Application**:
  - Router, typed API client with JWT bearer injection, and Auth Context.
  - Passenger Ride Request page with dynamic area dropdowns and live fare estimation.
  - Passenger Live Ride page with 5s polling, status timeline, vehicle information, and settlement buttons.
  - Passenger Ride History page with status filters.
  - Driver Dashboard with Easy-Bike profile, online/offline toggle, and open-requests feed.
  - Driver Active Pool view with live seat meter, active members list, join modal, and lifecycle transition triggers.
- **Phase 8 — Hardening**:
  - Error normalization with typed `AppError` and 422 Zod validation envelopes.
  - Pino request logging with request ID generation and actor tracing.
  - Graceful server shutdown on `SIGTERM`/`SIGINT` closing HTTP and Prisma connections.
  - 100% green test suites for backend (60/60 tests) and frontend (16/16 tests).
- **Phase 9 — Integration & Release Cut**:
  - Docker Compose verified end-to-end with Postgres, API server, and Nginx web reverse proxy.
  - Release branch `release/v1.0.0` cut from `pre-release`.
  - Tagged `v1.0.0`.
