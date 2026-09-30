# Dhaka Tesla Pool ⚡🛺

> **Share a seat. Split the fare. Survive Dhaka traffic.**  
> A high-concurrency, corridor-based ride pooling platform for Dhaka's battery-powered rickshaws ("Teslas").

[![Backend Live](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat&logo=render)](https://tesla-pool-jz5w.onrender.com/health)
[![Frontend Live](https://img.shields.io/badge/Frontend-Vercel-black?style=flat&logo=vercel)](https://tesla-pool-seven.vercel.app/)
[![Database](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![CI / Keep-Alive](https://github.com/ZamanAsad007/Tesla_Pool/actions/workflows/keep-alive.yml/badge.svg)](https://github.com/ZamanAsad007/Tesla_Pool/actions/workflows/keep-alive.yml)

---

## 📌 Table of Contents
1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [Live Deployments & Demo Video](#-live-deployments--demo-video)
3. [Demo Credentials (The Story Cast)](#-demo-credentials-the-story-cast)
4. [Features Implemented](#-features-implemented)
5. [UI Showcase & Screenshots](#-ui-showcase--screenshots)
6. [System Architecture](#-system-architecture)
7. [Database Architecture & ERD](#-database-architecture--erd)
8. [Tech Stack & Architecture Rationale](#-tech-stack--architecture-rationale)
9. [Project Structure](#-project-structure)
10. [Environment Variables](#-environment-variables)
11. [Local Setup & Docker Instructions](#-local-setup--docker-instructions)
12. [How to Run Tests](#-how-to-run-tests)
13. [API Overview](#-api-overview)
14. [Meaningful Testing Suite](#-meaningful-testing-suite)
15. [The Concurrency Problem (Interview Deep-Dive)](#-the-concurrency-problem-interview-deep-dive)
16. [Bonus: "If Oi Tesla Goes Viral" (1M Passengers / 100k Drivers)](#-bonus-if-oi-tesla-goes-viral-scaling-to-1m-passengers--100k-drivers)
17. [Key Decisions, Trade-offs & Known Limitations](#-key-decisions-trade-offs--known-limitations)
18. [AI Usage Disclosure](#-ai-usage-disclosure)

---

## 🚀 Executive Summary & Problem Statement

Dhaka’s transit system is notoriously choked with gridlock. Millions of commuters rely on local battery-powered three-wheelers—colloquially celebrated as **"Teslas"**—to navigate the city's key arterial transit corridors (**North**, **South**, **Center**, and **Outer**).

### The Problem
- **Empty Vehicle Capacity**: Drivers like **Jashim** operate 3-seat vehicles (such as his beloved *"Bullet"*). When picking up a solo passenger, drivers frequently navigate peak-hour traffic with 1 or 2 empty seats, losing potential revenue while burning battery charge.
- **Inflated Commute Fares**: Individual passengers (**Nusrat**, **Rafiq**, **Shirin**) heading in the same direction along shared corridors pay full solo fares, having no structured mechanism to pool rides safely.
- **The Concurrency & Overbooking Risk**: In high-demand zones (e.g., Banani, Gulshan 2, Farmgate), multiple passengers simultaneously attempt to claim the last remaining seat on a departing vehicle. Without rigorous database-level isolation, race conditions can corrupt vehicle capacity, double-book seats, and strand passengers.

### The Solution: Dhaka Tesla Pool
Dhaka Tesla Pool provides a deterministic corridor-matching engine with:
1. **Dynamic Corridor-Aware Pooling**: Passengers are matched into active pools only when both pickup and drop-off points align along compatible corridors.
2. **Transparent Tiered Fares**: Passengers receive automated pooling discounts (base fare + distance charge − pool discount), calculated down to exact integer *paisa*.
3. **Guaranteed Capacity Protection**: Row-level transaction locks (`SELECT ... FOR UPDATE`) backed by PostgreSQL check constraints physically prevent overbooking, guaranteeing that vehicle capacity is never exceeded.
4. **Resilient Production Infrastructure**: Deployed on **Vercel** (Frontend) and **Render** (Dockerized Express API) backed by **Supabase PostgreSQL**, kept perpetually awake via an automated GitHub Actions cron monitor.

---

## 🌐 Live Deployments & Demo Video

| Component | Platform | URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | [https://tesla-pool-seven.vercel.app/](https://tesla-pool-seven.vercel.app/) | ![Live](https://img.shields.io/badge/Status-Online-brightgreen) |
| **Backend API** | Render | [https://tesla-pool-jz5w.onrender.com](https://tesla-pool-jz5w.onrender.com) | ![Live](https://img.shields.io/badge/Status-Online-brightgreen) |
| **API Healthcheck** | Render | [https://tesla-pool-jz5w.onrender.com/health](https://tesla-pool-jz5w.onrender.com/health) | `{"ok": true, "db": "up"}` |
| **Database** | Supabase | AWS ap-southeast-1 (Transaction Pooler + Direct) | Connected & Migrated |
| **Demo Video Walkthrough** | Google Drive | [**Watch the 6-Minute Loom Walkthrough Video**](https://drive.google.com/drive/folders/19QXTuEwyK4oQk2YjeJo0TGgONbVdZFnM?usp=sharing) | Hosted on Drive |

> [!NOTE]
> The backend on Render is connected to a hosted Supabase PostgreSQL cluster. A GitHub Actions workflow (`.github/workflows/keep-alive.yml`) runs every 10 minutes to ping the `/health` endpoint, preventing Render's free tier from sleeping and Supabase from pausing.

---

## 👥 Demo Credentials (The Story Cast)

The database comes pre-seeded with the core characters and vehicle:

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Driver** | **Jashim** | `jashim@driver.test` | `password123` | Drives vehicle **Bullet** (Capacity: 3, Online) |
| **Passenger** | **Nusrat** | `nusrat@passenger.test` | `password123` | Starting Balance: 50,000 paisa (৳500.00) |
| **Passenger** | **Rafiq** | `rafiq@passenger.test` | `password123` | Starting Balance: 50,000 paisa (৳500.00) |
| **Passenger** | **Shirin** | `shirin@passenger.test` | `password123` | Starting Balance: 50,000 paisa (৳500.00) |

*(You can also use the registration form to create new Passenger or Driver accounts on the fly).*

---

## ⚡ Features Implemented

### 1. Passenger Journey
- **Authentication**: JWT-based sign-up, sign-in, and auto-session recovery.
- **Interactive Ride Quoting**: Choose from 14 pre-defined Dhaka hubs across 4 corridors (North, South, Center, Outer).
- **Instant Fare Transparency**: View itemized fare breakdown (Base ৳20 + Distance Charge ৳5/km − Pool Discount ৳10).
- **Seat Selection**: Request 1 to 3 seats; requests reject if passenger already has an active pending/matched ride.
- **Live Status Tracking**: Watch ride state transition in real time (`REQUESTED` → `MATCHED` → `ARRIVED` → `STARTED` → `COMPLETED`).
- **Cancellation Grace Rules**: Passengers can cancel freely while `REQUESTED`, `MATCHED`, or `ARRIVED`. Once `STARTED`, cancellation is rejected with `409 INVALID_STATE`.
- **Payment Settlement**: Automatically debits from the passenger's TeslaPay digital wallet (or marks as Cash) upon completion.

### 2. Driver Journey
- **Driver Dashboard**: Toggle vehicle online/offline status with one click.
- **Corridor Compatibility Feed**: Displays pending requests that match the driver's current active pool destination corridor.
- **One-Click Pool Acceptance**: Accept initial passenger to create a pool, then accept additional passengers up to vehicle capacity (3 seats).
- **Trip Lifecycle Controls**: Strict progression enforcement: `ARRIVED` → `STARTED` → `COMPLETED`.
- **Auto-Cancellation on Empty Pool**: If the last passenger cancels or leaves an in-progress pool, the pool auto-cancels and frees the driver immediately.

### 3. Core Domain & Business Invariants
- **Capacity Lockout**: Bullet has 3 seats. The 4th seat join strictly fails with `409 POOL_FULL`, and occupied seats remain 3.
- **Corridor Compatibility Enforcement**: Passengers traveling to mismatched corridors cannot join an existing pool (`409 NOT_COMPATIBLE`).
- **Integer Paisa Currency**: Zero floating-point arithmetic. 1 BDT = 100 paisa. All fare operations remain strictly deterministic.
- **Audit Logging**: Every state change records an immutable `PoolEvent` with actor ID, event type, and metadata snapshot.

---

## 📸 UI Showcase & Screenshots

All screenshots reflect the live, deployed web application.

<p align="center">
  <b>Landing Page & Hero</b><br>
  <img src="docs/screenshots/landing.png" alt="Dhaka Tesla Pool Landing Page" width="800" />
</p>

---

<p align="center">
  <b>Authentication: Sign In & Registration</b><br>
  <img src="docs/screenshots/signIn.png" alt="Sign In Screen" width="48%" />
  &nbsp;
  <img src="docs/screenshots/register.png" alt="Registration Screen" width="48%" />
</p>

---

<p align="center">
  <b>Passenger: Route Selection & Transparent Fare Breakdown</b><br>
  <img src="docs/screenshots/request-ride.png" alt="Request Ride Screen" width="800" />
</p>

---

<p align="center">
  <b>Passenger Dashboard: Active Ride Status & Wallet</b><br>
  <img src="docs/screenshots/dashboard-rider.png" alt="Passenger Dashboard" width="800" />
</p>

---

<p align="center">
  <b>Driver Dashboard: Vehicle Status, Compatibility Feed & Pool Management</b><br>
  <img src="docs/screenshots/dashboard-driver.png" alt="Driver Dashboard" width="800" />
</p>

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Edge CDN)"]
        User["Commuter / Driver Browser"]
        Vercel["Vercel Edge Network<br/>(React 18 + Vite SPA)"]
        User -->|HTTPS| Vercel
    end

    subgraph ServiceLayer ["API & Application Runtime (Render)"]
        RenderLB["Render Cloud Proxy / SSL Termination"]
        ExpressApp["Express API Runtime (Node.js 20 Alpine)<br/>• Zod Request Validation<br/>• JWT Bearer Auth & RBAC<br/>• Rate Limiting & Helmet Security<br/>• Pino Structured Logging"]
        Vercel -->|REST API Requests<br/>/api/v1/*| RenderLB
        RenderLB --> ExpressApp
    end

    subgraph Automation ["Continuous Availability"]
        GHA["GitHub Actions Cron<br/>(Every 10 min)"]
        GHA -->|GET /health| RenderLB
    end

    subgraph DatabaseLayer ["Database Layer (Supabase Postgres)"]
        Pooler["PgBouncer Transaction Pooler (Port 6543)<br/>Runtime Queries & Transactions"]
        Direct["Direct Session Connection (Port 5432)<br/>Prisma Migrations & DDL"]
        PostgresDB[(PostgreSQL 15 Instance<br/>• Row Locks SELECT FOR UPDATE<br/>• CHECK occupied_seats <= 3<br/>• Timestamptz Audit Logs)]

        ExpressApp -->|DATABASE_URL| Pooler
        ExpressApp -.->|DIRECT_URL| Direct
        Pooler --> PostgresDB
        Direct --> PostgresDB
    end
```

---

## 🗄 Database Architecture & ERD

The database schema is managed via Prisma migrations, with strict foreign key relationships, relational indexes, and check constraints.

```mermaid
erDiagram
    users ||--o{ teslas : "owns (1:1 driver)"
    users ||--o{ ride_requests : "requests (passenger)"
    users ||--o{ pool_memberships : "member (passenger)"
    users ||--o{ pools : "operates (driver)"
    users ||--o{ pool_events : "triggers (actor)"

    teslas ||--o{ pools : "assigned to"
    areas ||--o{ ride_requests : "pickup location"
    areas ||--o{ ride_requests : "dropoff location"

    pools ||--o{ pool_memberships : "contains"
    pools ||--o{ pool_events : "audits"
    ride_requests ||--o{ pool_memberships : "assigned"
    ride_requests ||--o{ fare_snapshots : "quotes"
    pool_memberships ||--o{ payments : "settles"

    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        enum role "PASSENGER | DRIVER"
        int wallet_balance_paisa
        timestamptz created_at
    }

    teslas {
        uuid id PK
        uuid owner_id FK,UK
        string name "e.g. Bullet"
        int capacity "CHECK capacity > 0"
        boolean online
        timestamptz created_at
    }

    areas {
        int id PK
        string name UK "e.g. Banani, Gulshan 2"
        enum corridor "NORTH | SOUTH | CENTER | OUTER"
        decimal lat
        decimal lng
    }

    ride_requests {
        uuid id PK
        uuid passenger_id FK
        int pickup_area_id FK
        int dropoff_area_id FK
        int seats "Default 1"
        enum status "REQUESTED | MATCHED | ARRIVED | STARTED | COMPLETED | CANCELLED"
        uuid idempotency_key UK
        timestamptz created_at
        timestamptz updated_at
    }

    pools {
        uuid id PK
        uuid tesla_id FK
        uuid driver_id FK
        int occupied_seats "CHECK occupied_seats <= capacity_snapshot"
        int capacity_snapshot "Snapshot of vehicle capacity (3)"
        enum status "MATCHED | ARRIVED | STARTED | COMPLETED | CANCELLED"
        timestamptz created_at
        timestamptz updated_at
    }

    pool_memberships {
        uuid id PK
        uuid pool_id FK
        uuid ride_request_id FK
        uuid passenger_id FK
        int seat_count
        int fare_paisa
        timestamptz joined_at
        timestamptz left_at
    }

    fare_snapshots {
        uuid id PK
        uuid ride_request_id FK
        int base_paisa
        int distance_paisa
        int discount_paisa
        int total_paisa
        json breakdown
        timestamptz quoted_at
    }

    pool_events {
        uuid id PK
        uuid pool_id FK
        uuid actor_id FK
        enum event "MATCHED | PASSENGER_JOINED | DRIVER_ARRIVED | STARTED | COMPLETED | CANCELLED"
        json meta
        timestamptz at
    }

    payments {
        uuid id PK
        uuid membership_id FK
        enum method "CASH | TESLAPAY"
        enum status "PENDING | SETTLED | FAILED | WAIVED"
        int amount_paisa
        timestamptz created_at
        timestamptz paid_at
    }
```

### Key Database Constraints
1. **`pools_occupied_seats_check`**: `CHECK (occupied_seats <= capacity_snapshot AND occupied_seats >= 0)`. Even if application code were compromised, PostgreSQL physically rejects any transaction attempting to over-fill a vehicle.
2. **`teslas_capacity_check`**: `CHECK (capacity > 0)`.
3. **Foreign Key Cascades**: Clean lifecycle management ensures dependent membership, fare, and payment records remain consistent.

---

## 🛠 Tech Stack & Architecture Rationale

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + Tailwind CSS | Fast HMR, minimal bundle size, zero-runtime CSS, responsive utility-first styling. |
| **Backend API** | Node.js 20 + Express | Lightweight, event-driven async I/O, robust ecosystem for REST endpoints. |
| **ORM / Data Access** | Prisma Client (v6.4.1) | Type-safe query building, declarative schema migrations, automated connection management. |
| **Validation** | Zod (v3.24) | Runtime schema validation with compile-time type inference for all request payloads. |
| **Database** | PostgreSQL 15 (Supabase) | Strict relational integrity, transaction isolation, and row-level locking (`FOR UPDATE`) for race condition prevention. |
| **Containerization** | Docker (Alpine Multi-Stage) | Reproducible builder-to-runner image minimization (~150MB footprint) with pinned CLI binaries. |
| **Security** | Helmet + CORS + Rate Limiting | HTTP security headers, origin protection, and brute-force mitigation on auth endpoints. |
| **Logging** | Pino + Pino-HTTP | High-throughput structured JSON logging with safe production fallbacks. |

---

## 📂 Project Structure

```text
Tesla_Pool/
├── .github/
│   └── workflows/
│       └── keep-alive.yml         # 10-minute cron ping to keep Render & Supabase awake
├── docs/
│   └── screenshots/              # UI walkthrough screenshots
├── api/                          # Express.js REST API
│   ├── prisma/
│   │   ├── migrations/           # SQL migration history
│   │   ├── schema.prisma         # Prisma schema with Supabase dual-url config
│   │   └── seed.ts               # Core cast seed script (Jashim, Nusrat, Rafiq, Shirin)
│   ├── src/
│   │   ├── config/               # Environment & logger configuration
│   │   ├── lib/                  # Prisma client, JWT, AppError primitives
│   │   ├── middleware/           # Auth guard, request validation, error handler
│   │   ├── modules/
│   │   │   ├── auth/             # Login, register, password hashing
│   │   │   ├── areas/            # Corridors, geolocations, Haversine distance
│   │   │   ├── teslas/           # Vehicle management & online status
│   │   │   ├── ride-requests/    # Passenger booking & cancellation
│   │   │   ├── pools/            # Pooling matching engine & lifecycle state machine
│   │   │   ├── fares/            # Deterministic fare calculation engine
│   │   │   ├── driver/           # Driver compatibility feed
│   │   │   └── payments/         # Cash settlement & TeslaPay wallet debiting
│   │   ├── app.ts                # Express app configuration
│   │   └── index.ts              # Server bootstrap with graceful shutdown
│   ├── tests/                    # Integration & unit test suites (Vitest)
│   ├── Dockerfile                # Production multi-stage Docker build
│   └── start.sh                  # Container entrypoint (migrations + exec node)
├── web/                          # React + Vite Frontend
│   ├── src/
│   │   ├── api/                  # API client & endpoint helpers
│   │   ├── components/           # Reusable UI widgets, badges, navbar
│   │   ├── context/              # Auth & session context
│   │   ├── pages/                # Passenger, Driver, Auth, and History views
│   │   └── utils/                # Currency formatters (Paisa -> BDT)
│   ├── Dockerfile                # Web container specification
│   └── vite.config.ts            # Vite bundler configuration
├── docker-compose.yml            # Local multi-container development environment
├── .env.example                  # Environment variable template
└── README.md                     # Comprehensive project documentation
```

---

## 🔐 Environment Variables

The project uses `.env.example` to document required configurations without exposing real secrets.

### Backend (`api/.env`)
```dotenv
# Port & Environment
PORT=4000
NODE_ENV=production

# Authentication Secret
JWT_SECRET="dev-secret-change-me-dhaka-tesla-pool"

# Database Connections (Supabase Postgres)
# DATABASE_URL: Transaction pooler on port 6543 (?pgbouncer=true) for runtime queries
DATABASE_URL="postgresql://postgres.USER:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL: Direct session connection on port 5432 for Prisma migrations
DIRECT_URL="postgresql://postgres.USER:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# CORS & Logging
CORS_ORIGIN="*"
LOG_LEVEL="info"
```

### Frontend (`web/.env`)
```dotenv
# API Base Endpoint (Points to Render production API or localhost)
VITE_API_URL="https://tesla-pool-jz5w.onrender.com/api/v1"
```

---

## 💻 Local Setup & Docker Instructions

### Prerequisites
- Node.js ≥ 20.x
- Docker & Docker Compose
- Git

### Option 1: Quickstart with Docker Compose (Recommended)
Clone the repository and run all services (Local Postgres DB, API, Frontend) with a single command:
```bash
git clone https://github.com/ZamanAsad007/Tesla_Pool.git
cd Tesla_Pool

# Build and start all services
docker compose up --build
```
- **Web App**: `http://localhost:5173`
- **API Server**: `http://localhost:4000`
- **API Health**: `http://localhost:4000/health`

---

### Option 2: Running Locally from Source

#### 1. Setup Backend API
```bash
cd api
npm install

# Copy environment variables and adjust as needed
cp ../.env.example .env

# Generate Prisma Client & apply migrations
npx prisma generate
npx prisma migrate deploy

# Seed initial story cast & corridors
npx prisma db seed

# Start API in development mode
npm run dev
```

#### 2. Setup Frontend Web App
```bash
cd ../web
npm install

# Start Vite dev server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 How to Run Tests

The test suite is powered by **Vitest** and **Supertest**, executing end-to-end integration tests against real database transactions:

```bash
# Run backend test suite (from api/ directory)
cd api
npm test

# Run a specific test suite (e.g., concurrency race tests)
npx vitest run tests/teslaPooling.test.ts -t "T2: Race test"

# Run frontend unit tests (from web/ directory)
cd ../web
npm test
```

---

## 📡 API Overview

Base URL: `/api/v1`

| Method | Endpoint | Auth | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | System & Database connectivity probe | `200`, `503` |
| `POST` | `/api/v1/auth/register` | Public | Register new Passenger or Driver | `201`, `400`, `409` |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue JWT | `200`, `401` |
| `GET` | `/api/v1/auth/me` | Bearer | Get current authenticated user profile | `200`, `401` |
| `GET` | `/api/v1/areas` | Public | List all 14 Dhaka corridor areas | `200` |
| `POST` | `/api/v1/fares/estimate`| Public | Calculate instant solo & pooled fares | `200`, `400` |
| `POST` | `/api/v1/ride-requests` | Passenger | Create a ride request (1–3 seats) | `201`, `400`, `409` |
| `GET` | `/api/v1/ride-requests/active`| Passenger | Get passenger's active ride request | `200`, `404` |
| `POST` | `/api/v1/ride-requests/:id/cancel`| Passenger | Cancel active ride request | `200`, `404`, `409` |
| `GET` | `/api/v1/teslas/my` | Driver | Get driver's registered vehicle | `200`, `404` |
| `PATCH`| `/api/v1/teslas/:id/status`| Driver | Toggle vehicle online/offline | `200`, `400`, `403` |
| `GET` | `/api/v1/driver/feed` | Driver | Pending requests matching active pool | `200` |
| `POST` | `/api/v1/pools/:id/join` | Driver | Accept passenger into pool | `200`, `404`, `409` |
| `PATCH`| `/api/v1/pools/:id/status`| Driver | Transition pool (`ARRIVED` → `STARTED` → `COMPLETED`) | `200`, `400`, `409` |
| `POST` | `/api/v1/pools/:id/cancel`| Driver | Cancel active pool | `200`, `404`, `409` |

---

## 🎯 Meaningful Testing Suite

Rather than chasing superficial code coverage, the test suite verifies **essential domain invariants**:

| Test ID | Scenario Tested | Test File | Verified Invariant |
| :--- | :--- | :--- | :--- |
| **T1** | **Bullet's Capacity Can Never Be Exceeded** | `tests/teslaPooling.test.ts` | Bullet has capacity 3. Three 1-seat requests join successfully; the 4th request is rejected with `409 POOL_FULL`. Occupied seats strictly stay at 3. |
| **T2** | **The Last-Seat Concurrency Race** | `tests/teslaPooling.test.ts` | Two concurrent join requests target the 1 remaining seat at the exact same millisecond. Exactly 1 succeeds (200 OK); the other is rejected (409 POOL_FULL). Zero seat overbooking. |
| **T3** | **Fare Calculation Model** | `tests/teslaPooling.test.ts` | Verifies exact worked-example calculations: Nusrat solo = ৳50 → pooled = **৳40** (4000 paisa); Rafiq solo = ৳40 → pooled = **৳32** (3200 paisa). |
| **T4** | **Invalid State Transitions Rejected** | `tests/poolsLifecycle.test.ts` | Rejects `STARTED` before `ARRIVED`, `COMPLETED` before `STARTED`, or updates to terminated pools with `409 INVALID_STATE`. |
| **T5** | **Multi-Tenant User Isolation** | `tests/rideRequests.test.ts` | Passenger B cannot cancel or modify Passenger A's ride request. Returns `404 NOT_FOUND` (preventing ID enumeration). |
| **T6** | **Cancellation Lifecycle Invariants** | `tests/poolsLifecycle.test.ts` | Cancellation succeeds while `REQUESTED`, `MATCHED`, or `ARRIVED`. Once `STARTED`, cancellation is strictly rejected with `409 INVALID_STATE`. |

---

## 🔒 The Concurrency Problem (Interview Deep-Dive)

### The Scenario
> *Bullet has 1 seat remaining. Nusrat and Shirin both see 1 seat available and click "Join Pool" at the exact same millisecond. How do we ensure that exactly one passenger gets the seat and Bullet never carries 4 people?*

### 1. How It Is Handled in the MVP
We prevent race conditions through a defense-in-depth model combining **application-level serializable locking** and **database-level physical check constraints**:

```typescript
// Inside pools.service.ts
return await prisma.$transaction(async (tx) => {
  // 1. Acquire an exclusive row lock on the Pool record
  const [lockedPool] = await tx.$queryRaw<Pool[]>`
    SELECT * FROM "pools" 
    WHERE "id" = ${poolId}::uuid 
    FOR UPDATE
  `;

  // 2. Evaluate capacity inside the lock
  if (lockedPool.occupiedSeats + requestedSeats > lockedPool.capacitySnapshot) {
    throw new AppError('POOL_FULL', 409, 'Vehicle has reached max passenger capacity');
  }

  // 3. Atomically increment occupied seats and create membership
  await tx.pool.update({
    where: { id: poolId },
    data: { occupiedSeats: { increment: requestedSeats } },
  });
  
  await tx.poolMembership.create({ ... });
});
```

#### Why This Works:
1. **`SELECT ... FOR UPDATE`**: When Transaction A (Nusrat) enters the transaction, PostgreSQL places an exclusive row-level lock on the `pools` record.
2. **Deterministic Serialization**: Transaction B (Shirin) arrives simultaneously and is forced to wait until Transaction A commits or rolls back.
3. **Fresh State Evaluation**: When Transaction B acquires the lock, it reads the freshly updated `occupiedSeats = 3`. The check `3 + 1 > 3` evaluates to true, cleanly throwing `409 POOL_FULL`.
4. **PostgreSQL CHECK Constraint Safety Net**:
   ```sql
   ALTER TABLE "pools" ADD CONSTRAINT "pools_occupied_seats_check" 
   CHECK (occupied_seats <= capacity_snapshot AND occupied_seats >= 0);
   ```
   Even if an application developer bypassed the `FOR UPDATE` clause, PostgreSQL physically aborts and rolls back any query that would result in `occupied_seats > 3`.
5. **Connection Pooler Integrity**: Because Supabase's transaction pooler (port 6543) operates in transaction mode, the entire `prisma.$transaction` block is pinned to a single physical connection, guaranteeing lock consistency.

---

### 2. What Changes at Larger Scale (Distributed Architecture)
At 10,000+ requests per second across distributed backend instances, relying exclusively on database row locks creates lock contention and connection pool exhaustion. 

Here is the architectural evolution for larger scale:
1. **Distributed Locks with Redis (Redlock)**:
   - Acquire a lightweight, timed lock on `lock:pool:<poolId>` in Redis with sub-millisecond latency before hitting PostgreSQL.
   - Reduces database lock queue depth by 95%.
2. **Optimistic Concurrency Control (OCC) with Versioning**:
   - Add a `version` column to the `pools` table:
     ```sql
     UPDATE pools SET occupied_seats = occupied_seats + 1, version = version + 1 
     WHERE id = :id AND version = :current_version AND occupied_seats < capacity_snapshot;
     ```
   - If the update returns 0 affected rows, another transaction won the race; the losing request retries or fails immediately without blocking connections.
3. **Partitioned In-Memory Message Queues**:
   - Partition incoming join requests by `corridorId` or `poolId` into Apache Kafka / AWS SQS FIFO queues.
   - A single-threaded worker process handles all joins for a specific vehicle sequentially in memory, writing confirmed batches to the database asynchronously.

---

## 📈 Bonus: “If Oi Tesla Goes Viral” (Scaling to 1M Passengers & 100k Drivers)

If Dhaka Tesla Pool explodes in adoption across Bangladesh, the system must scale to handle **1,000,000 active passengers**, **100,000 drivers**, and peak commute surges of **50,000 requests/second**.

### High-Scale Target Architecture

```mermaid
flowchart TD
    DNS["Anycast DNS & Cloudflare CDN / WAF<br/>• DDoS Protection & SSL<br/>• Edge Token Verification"]
    ALB["AWS Application Load Balancer / NGINX Ingress"]
    DNS --> ALB

    subgraph ServiceMesh ["Containerized Microservices (EKS / ECS Autoscaled)"]
        AuthSvc["Auth & User Service"]
        RideSvc["Ride Booking Service"]
        MatchSvc["Matching Engine (Go / Rust)"]
        TrackingSvc["Real-Time Tracking Service (WebSockets)"]
        PaymentSvc["Payment & Wallet Service"]
    end

    ALB --> AuthSvc
    ALB --> RideSvc
    ALB --> TrackingSvc

    subgraph InMemLayer ["Distributed Memory & Caching (Redis Cluster)"]
        RedisLock["Redis Distributed Lock (Redlock)"]
        RedisGeo["Redis Geospatial Index (H3 / Geohash)"]
        RedisPubSub["Redis Pub/Sub Event Mesh"]
    end

    RideSvc <--> RedisLock
    TrackingSvc <--> RedisGeo
    TrackingSvc <--> RedisPubSub

    subgraph EventStream ["Asynchronous Event Mesh (Apache Kafka)"]
        KafkaPool["Topic: ride.requested"]
        KafkaMatch["Topic: ride.matched"]
        KafkaPay["Topic: payment.settled"]
    end

    RideSvc --> KafkaPool
    KafkaPool --> MatchSvc
    MatchSvc --> KafkaMatch
    KafkaMatch --> RideSvc
    RideSvc --> KafkaPay
    KafkaPay --> PaymentSvc

    subgraph DataLayer ["Sharded PostgreSQL Cluster (Amazon Aurora)"]
        Router["Citus / Vitess Sharding Proxy"]
        ShardNorth[(Shard: North Corridor)]
        ShardSouth[(Shard: South Corridor)]
        ShardCenter[(Shard: Center Corridor)]
        ShardOuter[(Shard: Outer Corridor)]
        ReadReplica[(Global Read Replicas)]

        Router --> ShardNorth
        Router --> ShardSouth
        Router --> ShardCenter
        Router --> ShardOuter
        Router -.-> ReadReplica
    end

    RideSvc --> Router
    PaymentSvc --> Router
```

### The 15 Scaling Dimensions: Architectural Breakdown

#### 1. Load Balancing & Edge Routing
- **Cloudflare Edge**: Terminates SSL/TLS, blocks volumetric DDoS attacks, handles CORS preflight caching, and routes traffic via Anycast DNS to the nearest AWS edge point of presence.
- **AWS ALB**: Distributes traffic across containerized API pods using round-robin with active health probing (`/health`).

#### 2. Horizontal Pod Autoscaling (HPA)
- API services deployed as stateless containers on **AWS EKS (Kubernetes)**.
- HPA triggers automated pod scaling from 10 to 200+ replicas based on CPU utilization (>70%) and custom Prometheus metrics (HTTP requests per second).

#### 3. Database Scaling & Read Replicas
- Migrate to **Amazon Aurora PostgreSQL** with automated multi-AZ storage auto-scaling.
- Separate reads from writes: 90% of traffic (browsing available pools, viewing fare tables, reading ride history) directed to **read replicas** via connection pooling proxies (PgBouncer). Write operations remain dedicated to the primary writer.

#### 4. Database Contention & Corridor Sharding
- A monolithic table creates disk I/O bottlenecks during peak morning rush.
- **Sharding by Corridor**: Partition pools, memberships, and ride requests horizontally by `corridor` (NORTH, SOUTH, CENTER, OUTER) using **Citus**. Because pools never cross between incompatible corridors, transactions remain localized to a single shard, eliminating distributed 2-phase commits.

#### 5. Geospatial Indexing & Search
- Replace static area IDs with **Uber's H3 Spatial Indexing** or **PostGIS**.
- Group passenger pickups into H3 Hexagon Resolution 8 (~460 meters). A driver moving through an H3 cell queries matching passenger demand in $O(1)$ time via Redis `GEORADIUS` / `GEOSEARCH`.

#### 6. In-Memory Caching Strategy
- **Redis Cluster**: Caches high-read, low-write domain data (area coordinate tables, corridor maps, active driver profiles) with TTLs.
- Cache invalidation uses event-driven cache-aside: when a driver toggles online/offline, a Pub/Sub event invalidates that driver's cache key.

#### 7. Asynchronous Event Queuing (Apache Kafka)
- Decouple user-facing HTTP responses from background processing.
- Requesting a ride pushes an event `ride.requested` to **Kafka**. The HTTP API immediately returns `202 Accepted` with a tracking ID.
- Matchmaking, push notifications, driver alerts, and analytics consume asynchronously from Kafka partitions without slowing down the primary HTTP thread.

#### 8. Real-time Communication (WebSockets & Socket.IO)
- Replace HTTP polling with persistent bidirectional WebSockets.
- Deploy a dedicated WebSocket gateway cluster backed by **Redis Pub/Sub** adapter. When Jashim updates his location or accepts a ride, all pooled passengers receive sub-100ms UI updates.

#### 9. Distributed Rate Limiting
- Implement Redis-backed **Token Bucket** algorithm at the API gateway layer.
- Enforce tiered limits:
  - Public endpoints (`/auth/*`): 10 requests / min per IP.
  - Passenger ride creation (`/ride-requests`): 5 requests / min per User ID.
  - Driver status updates: 60 requests / min per Driver ID.

#### 10. End-to-End Idempotency
- Pass an `Idempotency-Key` header with all state-mutating requests (`POST /ride-requests`, `POST /pools/:id/join`).
- The API stores the key in Redis with a 24-hour TTL. If a network blip causes a mobile client to retry, the API detects the cached key and returns the identical previous response without re-executing booking or debiting funds.

#### 11. Full-Stack Observability & Tracing
- **Metrics**: Prometheus scrapes latency, error rates, and connection pool saturation; visualized via Grafana dashboards.
- **Distributed Tracing**: Instrument OpenTelemetry across microservices to trace requests from Edge LB → API → Redis → DB.
- **Structured Logging**: Production JSON logs shipped via FluentBit to Elasticsearch / Datadog for instant log filtering.

#### 12. Decoupled Matchmaking Engine
- Separate the matchmaker into a high-performance worker (built in Go or Rust).
- Runs batch bipartite matching (Hungarian Algorithm) every 3 seconds across active demand in each corridor, optimizing for minimum detour distance and maximum vehicle occupancy.

#### 13. Retry & Failure Resilience
- Implement **Exponential Backoff with Full Jitter** on all mobile-to-backend API calls.
- Deploy **Circuit Breakers** (via Envoy) on external dependencies (e.g., payment gateways). If failures exceed 50%, the circuit opens to fail fast and shed load rather than exhausting server threads.
- Unprocessable background jobs route to a **Dead Letter Queue (DLQ)** for manual operator inspection.

#### 14. Enterprise Security & Hardening
- **Mutual TLS (mTLS)**: Enforce encrypted mTLS communication between all internal microservices.
- **JWT Public-Key Rotation**: Use asymmetric RS256 keys; rotate signing keys weekly via AWS Secrets Manager.
- **OWASP Compliance**: Automated input sanitization, SQL-injection prevention via parameterized ORM queries, and strict Content Security Policies.

#### 15. Zero-Downtime Deployment Strategy
- **Blue-Green / Canary Deployments**: New container versions deploy to a 5% canary fleet. Automated monitoring tracks error rates and latency for 5 minutes; if error budgets exceed 0.1%, deployment rolls back automatically.
- **Database Migrations**: Enforce backward-compatible schema changes (Expand-Contract pattern) so v1 and v2 API pods can run concurrently against the database without locks.

---

## ⚖️ Key Decisions, Trade-offs & Known Limitations

### Key Architectural Decisions
1. **Integer Paisa Arithmetic**: Floating-point numbers in JavaScript (`0.1 + 0.2 = 0.30000000000000004`) lead to rounding bugs when splitting fares. Storing all currency as integer *paisa* (1 BDT = 100 paisa) guarantees mathematical precision across all fee calculations.
2. **PostgreSQL Row Locks over Redis Locks in MVP**: While Redis distributed locks are ideal at viral scale, introducing Redis to an MVP introduces extra operational failure modes. PostgreSQL's native `FOR UPDATE` transaction locks provided zero-dependency ACID safety that held up under concurrency testing.
3. **Corridor Partitioning over Real-Time GPS Routing**: Full-fledged shortest-path routing (e.g., Dijkstra on OpenStreetMap) requires significant compute. Partitioning Dhaka into 4 logical corridors (North, South, Center, Outer) provides a clear, defensible MVP abstraction that accurately reflects real-world arterial commuting patterns.

### Known Limitations
- **Corridor Granularity**: Areas are modeled as designated nodes rather than dynamic polygon boundaries.
- **Polling vs WebSockets**: The current frontend polls every 3–5 seconds for status updates. Moving to WebSockets is the top architectural improvement.
- **Cold Start Latency on Free Tiers**: Render free tier instances spin down after 15 minutes of inactivity. The GitHub Actions keep-alive workflow mitigates this, but occasional cold starts can still occur if GitHub's scheduler delays.

---

## 🤖 AI Usage Disclosure

In compliance with project guidelines, here is the transparent disclosure of AI tooling used during development:

| Aspect | Details |
| :--- | :--- |
| **Tools Used** | Cursor, GitHub Copilot, Google DeepMind Antigravity CLI. |
| **Role & Purpose** | Scaffolding repetitive React form components, generating initial Prisma schema boilerplate, authoring boilerplate test suites, and formatting documentation. |
| **Accepted AI Suggestions** | Utilizing PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside transactions to resolve the seat concurrency race condition; using integer *paisa* for currency representation. |
| **Rejected AI Suggestions** | An AI suggestion proposed deploying a multi-service microservices architecture with Apache Kafka and Redis for the initial MVP. **Rejected** because it would introduce unwarranted operational complexity, increased infrastructure costs, and unnecessary points of failure for a focused, evaluatable MVP. |

---

## 📄 License & Credits
Developed by **Asad Zaman** for the Dhaka Tesla Pool Initiative.  
Licensed under the [MIT License](LICENSE).
