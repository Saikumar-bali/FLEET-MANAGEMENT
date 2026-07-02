-- Create VehicleCheckoutStatus enum
CREATE TYPE "VehicleCheckoutStatus" AS ENUM ('ACTIVE', 'RETURNED', 'CANCELLED', 'OVERDUE');

-- Add CHECKED_OUT to VehicleStatus enum
ALTER TYPE "VehicleStatus" ADD VALUE IF NOT EXISTS 'CHECKED_OUT';

-- Create vehicle_checkouts table
CREATE TABLE "vehicle_checkouts" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "VehicleCheckoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "purpose" TEXT,
    "trip_type" TEXT,
    "start_odometer" INTEGER,
    "end_odometer" INTEGER,
    "checked_out_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_return_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_checkouts_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "vehicle_checkouts" ADD CONSTRAINT "vehicle_checkouts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_checkouts" ADD CONSTRAINT "vehicle_checkouts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_checkouts" ADD CONSTRAINT "vehicle_checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "vehicle_checkouts_vehicle_id_status_idx" ON "vehicle_checkouts"("vehicle_id", "status");
CREATE INDEX "vehicle_checkouts_driver_id_status_idx" ON "vehicle_checkouts"("driver_id", "status");
