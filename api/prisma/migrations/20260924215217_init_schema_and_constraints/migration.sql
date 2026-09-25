-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PASSENGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "Corridor" AS ENUM ('NORTH', 'SOUTH', 'CENTER', 'OUTER');

-- CreateEnum
CREATE TYPE "RideRequestStatus" AS ENUM ('REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('MATCHED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoolEventType" AS ENUM ('MATCHED', 'PASSENGER_JOINED', 'PASSENGER_LEFT', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TESLAPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'WAIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "wallet_balance_paisa" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teslas" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teslas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "corridor" "Corridor" NOT NULL,
    "lat" DECIMAL(10,7) NOT NULL,
    "lng" DECIMAL(10,7) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_requests" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "pickup_area_id" INTEGER NOT NULL,
    "dropoff_area_id" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" "RideRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "idempotency_key" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ride_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL,
    "tesla_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'MATCHED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_memberships" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "seat_count" INTEGER NOT NULL,
    "fare_paisa" INTEGER NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,

    CONSTRAINT "pool_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fare_snapshots" (
    "id" UUID NOT NULL,
    "ride_request_id" UUID NOT NULL,
    "base_paisa" INTEGER NOT NULL,
    "distance_paisa" INTEGER NOT NULL,
    "discount_paisa" INTEGER NOT NULL,
    "total_paisa" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "quoted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fare_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_events" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "event" "PoolEventType" NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount_paisa" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teslas_owner_id_key" ON "teslas"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_key" ON "areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ride_requests_idempotency_key_key" ON "ride_requests"("idempotency_key");

-- CreateIndex
CREATE INDEX "ride_requests_status_pickup_area_id_idx" ON "ride_requests"("status", "pickup_area_id");

-- CreateIndex
CREATE UNIQUE INDEX "fare_snapshots_ride_request_id_quoted_at_key" ON "fare_snapshots"("ride_request_id", "quoted_at");

-- AddForeignKey
ALTER TABLE "teslas" ADD CONSTRAINT "teslas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_pickup_area_id_fkey" FOREIGN KEY ("pickup_area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_requests" ADD CONSTRAINT "ride_requests_dropoff_area_id_fkey" FOREIGN KEY ("dropoff_area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_tesla_id_fkey" FOREIGN KEY ("tesla_id") REFERENCES "teslas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_memberships" ADD CONSTRAINT "pool_memberships_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_memberships" ADD CONSTRAINT "pool_memberships_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_memberships" ADD CONSTRAINT "pool_memberships_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_snapshots" ADD CONSTRAINT "fare_snapshots_ride_request_id_fkey" FOREIGN KEY ("ride_request_id") REFERENCES "ride_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_events" ADD CONSTRAINT "pool_events_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_events" ADD CONSTRAINT "pool_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "pool_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom Constraints & Partial Unique Indexes (DESIGN.md §3)
-- 1. Tesla capacity must be greater than 0
ALTER TABLE "teslas" ADD CONSTRAINT "teslas_capacity_check" CHECK ("capacity" > 0);

-- 2. One open ride request per passenger
CREATE UNIQUE INDEX "one_open_request_per_passenger" ON "ride_requests"("passenger_id")
WHERE "status" IN ('REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED');

-- 3. One active pool per tesla
CREATE UNIQUE INDEX "one_active_pool_per_tesla" ON "pools"("tesla_id")
WHERE "status" NOT IN ('COMPLETED', 'CANCELLED');

-- 4. One open pool membership per ride request
CREATE UNIQUE INDEX "one_open_membership_per_request" ON "pool_memberships"("ride_request_id")
WHERE "left_at" IS NULL;
