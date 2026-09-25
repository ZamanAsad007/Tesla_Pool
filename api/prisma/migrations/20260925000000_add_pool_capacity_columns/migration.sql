-- AlterTable
ALTER TABLE "pools" ADD COLUMN "occupied_seats" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pools" ADD COLUMN "capacity_snapshot" INTEGER NOT NULL DEFAULT 3;

-- Check constraint backstop (§3 #6, §8)
ALTER TABLE "pools" ADD CONSTRAINT "pools_occupied_seats_check"
CHECK ("occupied_seats" >= 0 AND "occupied_seats" <= "capacity_snapshot");
