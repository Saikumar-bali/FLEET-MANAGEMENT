-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'INACTIVE', 'SOLD', 'ACCIDENT');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssetCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'UNDER_REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetAssignmentHolderType" AS ENUM ('VEHICLE', 'DRIVER', 'USER');

-- CreateEnum
CREATE TYPE "AssetAssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED', 'TRANSFERRED', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "AssetHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'RETURNED', 'TRANSFERRED', 'DAMAGED', 'LOST', 'REPAIRED', 'RETIRED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL');

-- CreateEnum
CREATE TYPE "TripHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED', 'VEHICLE_CHANGED', 'DRIVER_CHANGED');

-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('VEHICLE', 'DRIVER', 'ASSET');

-- CreateEnum
CREATE TYPE "WorkflowRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InsurancePolicyType" AS ENUM ('THIRD_PARTY', 'COMPREHENSIVE', 'OWN_DAMAGE', 'PACKAGE');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('NATIONAL', 'STATE', 'GOODS_CARRIAGE', 'CONTRACT_CARRIAGE', 'TOURIST', 'STAGE_CARRIAGE', 'PRIVATE_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmissionNorm" AS ENUM ('BSIII', 'BSIV', 'BSVI', 'OTHER');

-- CreateEnum
CREATE TYPE "RoadTaxType" AS ENUM ('LIFETIME', 'ANNUAL', 'QUARTERLY', 'MONTHLY', 'OTHER');

-- CreateEnum
CREATE TYPE "FastagStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'LOW_BALANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "GpsDeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FAULTY', 'REMOVED');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('RC', 'INSURANCE', 'PERMIT', 'FITNESS', 'PUC', 'ROAD_TAX', 'FASTAG', 'GPS_AIS140', 'HYPOTHECATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceDocStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplianceHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'RENEWED', 'VERIFIED', 'EXPIRED', 'REMINDER_DUE', 'DOCUMENT_LINKED', 'STATUS_CHANGED', 'DELETED');

-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('CASH', 'BANK', 'WALLET', 'CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceCategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinanceCategoryModule" AS ENUM ('TRIP', 'FUEL', 'EXPENSE', 'MAINTENANCE', 'REPAIR', 'COMPLIANCE', 'DRIVER', 'GENERAL');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('FUEL_STATION', 'WORKSHOP', 'INSURANCE', 'PERMIT_AGENT', 'RTO_AGENT', 'GPS_VENDOR', 'GENERAL');

-- CreateEnum
CREATE TYPE "TripBillingPaymentStatus" AS ENUM ('UNBILLED', 'BILLED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinanceSourceModule" AS ENUM ('TRIP', 'FUEL', 'EXPENSE', 'MAINTENANCE', 'REPAIR', 'COMPLIANCE', 'DRIVER', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancePaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceHistoryEntityType" AS ENUM ('TRANSACTION', 'TRIP_BILLING', 'PAYMENT', 'VENDOR', 'CUSTOMER', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "FinanceHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'DELETED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "vehicle_number" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "fuel_type" TEXT NOT NULL,
    "chassis_number" TEXT,
    "engine_number" TEXT,
    "rc_number" TEXT,
    "insurance_expiry" TIMESTAMP(3),
    "fitness_expiry" TIMESTAMP(3),
    "pollution_expiry" TIMESTAMP(3),
    "permit_expiry" TIMESTAMP(3),
    "current_odometer" INTEGER NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_driver_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternate_mobile" TEXT,
    "license_number" TEXT NOT NULL,
    "license_expiry" TIMESTAMP(3),
    "address" TEXT,
    "emergency_contact" TEXT,
    "experience_years" INTEGER,
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "status" "AssetCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "asset_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_category_id" TEXT NOT NULL,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_amount" DECIMAL(65,30),
    "current_status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "assigned_to_type" "AssetAssignmentHolderType" NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMP(3),
    "status" "AssetAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_history" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "action" "AssetHistoryAction" NOT NULL,
    "from_holder_type" "AssetAssignmentHolderType",
    "from_holder_id" TEXT,
    "to_holder_type" "AssetAssignmentHolderType",
    "to_holder_id" TEXT,
    "remarks" TEXT,
    "proof_url" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "trip_number" TEXT NOT NULL,
    "trip_type" "TripType" NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "assistant_driver_id" TEXT,
    "origin_name" TEXT NOT NULL,
    "origin_address" TEXT,
    "destination_name" TEXT NOT NULL,
    "destination_address" TEXT,
    "planned_start_at" TIMESTAMP(3),
    "actual_start_at" TIMESTAMP(3),
    "planned_end_at" TIMESTAMP(3),
    "actual_end_at" TIMESTAMP(3),
    "start_odometer" INTEGER,
    "end_odometer" INTEGER,
    "distance_km" INTEGER,
    "purpose" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_history" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "action" "TripHistoryAction" NOT NULL,
    "from_status" "TripStatus",
    "to_status" "TripStatus",
    "remarks" TEXT,
    "metadata" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_entries" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "driver_id" TEXT,
    "fuel_date" TIMESTAMP(3) NOT NULL,
    "odometer_reading" INTEGER,
    "fuel_type" TEXT NOT NULL,
    "quantity_liters" DECIMAL(12,3) NOT NULL,
    "price_per_liter" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "station_name" TEXT,
    "receipt_number" TEXT,
    "notes" TEXT,
    "status" "WorkflowRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "driver_id" TEXT,
    "category" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "vendor" TEXT,
    "receipt_number" TEXT,
    "notes" TEXT,
    "status" "WorkflowRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "entity_type" "DocumentEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT,
    "expiry_date" TIMESTAMP(3),
    "file_url" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "driver_id" TEXT,
    "request_date" TIMESTAMP(3) NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_cost" DECIMAL(14,2),
    "actual_cost" DECIMAL(14,2),
    "scheduled_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "notes" TEXT,
    "status" "WorkflowRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repairs" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "driver_id" TEXT,
    "repair_date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_cost" DECIMAL(14,2),
    "actual_cost" DECIMAL(14,2),
    "provider" TEXT,
    "invoice_number" TEXT,
    "notes" TEXT,
    "status" "RepairStatus" NOT NULL DEFAULT 'OPEN',
    "created_by" TEXT,
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_registration_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "registration_number" TEXT,
    "registration_date" TIMESTAMP(3),
    "owner_name" TEXT,
    "rto_code" TEXT,
    "rto_name" TEXT,
    "vehicle_class" TEXT,
    "transport_category" TEXT,
    "body_type" TEXT,
    "seating_capacity" INTEGER,
    "gross_vehicle_weight" INTEGER,
    "unladen_weight" INTEGER,
    "hypothecation_name" TEXT,
    "hypothecation_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_registration_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_insurance_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "insurer_name" TEXT NOT NULL,
    "policy_type" "InsurancePolicyType" NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "premium_amount" DECIMAL(14,2),
    "idv_amount" DECIMAL(14,2),
    "renewal_reminder_days" INTEGER DEFAULT 30,
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_insurance_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_permit_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "permit_number" TEXT NOT NULL,
    "permit_type" "PermitType" NOT NULL,
    "issuing_authority" TEXT,
    "covered_states" TEXT,
    "covered_routes" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "renewal_reminder_days" INTEGER DEFAULT 30,
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_permit_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_fitness_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "inspection_date" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "inspection_center" TEXT,
    "remarks" TEXT,
    "renewal_reminder_days" INTEGER DEFAULT 30,
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_fitness_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_puc_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "emission_norm" "EmissionNorm" NOT NULL,
    "testing_center" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "renewal_reminder_days" INTEGER DEFAULT 30,
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_puc_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_road_tax_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "tax_receipt_number" TEXT NOT NULL,
    "tax_type" "RoadTaxType" NOT NULL,
    "paid_from" TIMESTAMP(3) NOT NULL,
    "paid_to" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2),
    "issuing_state" TEXT,
    "renewal_reminder_days" INTEGER DEFAULT 30,
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_road_tax_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_fastag_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "fastag_id" TEXT NOT NULL,
    "issuer_bank" TEXT,
    "linked_mobile_masked" TEXT,
    "status" "FastagStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_recharge_date" TIMESTAMP(3),
    "last_known_balance" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_fastag_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_gps_device_details" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "imei" TEXT,
    "sim_number_masked" TEXT,
    "vendor_name" TEXT,
    "installed_at" TIMESTAMP(3),
    "ais140_certified" BOOLEAN NOT NULL DEFAULT false,
    "certificate_number" TEXT,
    "status" "GpsDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_gps_device_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_compliance_documents" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "compliance_type" "ComplianceType" NOT NULL,
    "document_number" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "issuing_authority" TEXT,
    "external_file_url" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_compliance_history" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "compliance_type" "ComplianceType" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" "ComplianceHistoryAction" NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "remarks" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_compliance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceAccountType" NOT NULL,
    "account_number_masked" TEXT,
    "bank_name" TEXT,
    "opening_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceCategoryType" NOT NULL,
    "module" "FinanceCategoryModule" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "vendor_code" TEXT,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "trade_name" TEXT,
    "vendor_type" "VendorType" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "state" TEXT,
    "state_code" TEXT,
    "pincode" TEXT,
    "contact_person_name" TEXT,
    "contact_person_phone" TEXT,
    "payment_terms_days" INTEGER,
    "bank_account_masked" TEXT,
    "ifsc_code" TEXT,
    "upi_id" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customer_code" TEXT,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "trade_name" TEXT,
    "customer_type" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "state" TEXT,
    "state_code" TEXT,
    "pincode" TEXT,
    "billing_address" TEXT,
    "shipping_address" TEXT,
    "contact_person_name" TEXT,
    "contact_person_phone" TEXT,
    "payment_terms_days" INTEGER,
    "credit_limit" DECIMAL(65,30),
    "is_gst_registered" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_billings" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "vehicle_id" TEXT,
    "driver_id" TEXT,
    "invoice_number" TEXT,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "lr_number" TEXT,
    "challan_number" TEXT,
    "eway_bill_number" TEXT,
    "customer_po_number" TEXT,
    "place_of_supply_state" TEXT,
    "origin_state" TEXT,
    "destination_state" TEXT,
    "freight_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "loading_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unloading_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "detention_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "toll_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "permit_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "other_charges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tds_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "net_receivable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "payment_status" "TripBillingPaymentStatus" NOT NULL DEFAULT 'UNBILLED',
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_billings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "transaction_type" "FinanceTransactionType" NOT NULL,
    "source_module" "FinanceSourceModule" NOT NULL,
    "source_id" TEXT,
    "vehicle_id" TEXT,
    "trip_id" TEXT,
    "driver_id" TEXT,
    "vendor_id" TEXT,
    "customer_id" TEXT,
    "account_id" TEXT,
    "category_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "tax_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "payment_status" "FinancePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference_number" TEXT,
    "description" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "transaction_id" TEXT,
    "trip_billing_id" TEXT,
    "account_id" TEXT,
    "vendor_id" TEXT,
    "customer_id" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "upi_reference" TEXT,
    "bank_utr_number" TEXT,
    "cheque_number" TEXT,
    "cheque_date" TIMESTAMP(3),
    "received_by_id" TEXT,
    "collected_by_driver_id" TEXT,
    "reconciled_status" TEXT DEFAULT 'UNRECONCILED',
    "reconciled_at" TIMESTAMP(3),
    "reference_number" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_history" (
    "id" TEXT NOT NULL,
    "entity_type" "FinanceHistoryEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "FinanceHistoryAction" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "remarks" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_number_key" ON "vehicles"("vehicle_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_chassis_number_key" ON "vehicles"("chassis_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_engine_number_key" ON "vehicles"("engine_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_mobile_key" ON "drivers"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_key_key" ON "asset_categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_code_key" ON "assets"("asset_code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serial_number_key" ON "assets"("serial_number");

-- CreateIndex
CREATE INDEX "asset_assignments_asset_id_status_idx" ON "asset_assignments"("asset_id", "status");

-- CreateIndex
CREATE INDEX "asset_history_asset_id_created_at_idx" ON "asset_history"("asset_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trips_trip_number_key" ON "trips"("trip_number");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_status_idx" ON "trips"("vehicle_id", "status");

-- CreateIndex
CREATE INDEX "trips_driver_id_status_idx" ON "trips"("driver_id", "status");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trip_history_trip_id_created_at_idx" ON "trip_history"("trip_id", "created_at");

-- CreateIndex
CREATE INDEX "fuel_entries_vehicle_id_fuel_date_idx" ON "fuel_entries"("vehicle_id", "fuel_date");

-- CreateIndex
CREATE INDEX "fuel_entries_trip_id_idx" ON "fuel_entries"("trip_id");

-- CreateIndex
CREATE INDEX "fuel_entries_driver_id_idx" ON "fuel_entries"("driver_id");

-- CreateIndex
CREATE INDEX "fuel_entries_status_idx" ON "fuel_entries"("status");

-- CreateIndex
CREATE INDEX "expenses_vehicle_id_expense_date_idx" ON "expenses"("vehicle_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_trip_id_idx" ON "expenses"("trip_id");

-- CreateIndex
CREATE INDEX "expenses_driver_id_idx" ON "expenses"("driver_id");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "maintenance_requests_vehicle_id_request_date_idx" ON "maintenance_requests"("vehicle_id", "request_date");

-- CreateIndex
CREATE INDEX "maintenance_requests_trip_id_idx" ON "maintenance_requests"("trip_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_driver_id_idx" ON "maintenance_requests"("driver_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "repairs_vehicle_id_repair_date_idx" ON "repairs"("vehicle_id", "repair_date");

-- CreateIndex
CREATE INDEX "repairs_trip_id_idx" ON "repairs"("trip_id");

-- CreateIndex
CREATE INDEX "repairs_driver_id_idx" ON "repairs"("driver_id");

-- CreateIndex
CREATE INDEX "repairs_status_idx" ON "repairs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_registration_details_vehicle_id_key" ON "vehicle_registration_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_registration_details_vehicle_id_idx" ON "vehicle_registration_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_insurance_details_vehicle_id_idx" ON "vehicle_insurance_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_insurance_details_valid_to_idx" ON "vehicle_insurance_details"("valid_to");

-- CreateIndex
CREATE INDEX "vehicle_insurance_details_status_idx" ON "vehicle_insurance_details"("status");

-- CreateIndex
CREATE INDEX "vehicle_permit_details_vehicle_id_idx" ON "vehicle_permit_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_permit_details_valid_to_idx" ON "vehicle_permit_details"("valid_to");

-- CreateIndex
CREATE INDEX "vehicle_permit_details_status_idx" ON "vehicle_permit_details"("status");

-- CreateIndex
CREATE INDEX "vehicle_fitness_details_vehicle_id_idx" ON "vehicle_fitness_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_fitness_details_valid_to_idx" ON "vehicle_fitness_details"("valid_to");

-- CreateIndex
CREATE INDEX "vehicle_fitness_details_status_idx" ON "vehicle_fitness_details"("status");

-- CreateIndex
CREATE INDEX "vehicle_puc_details_vehicle_id_idx" ON "vehicle_puc_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_puc_details_valid_to_idx" ON "vehicle_puc_details"("valid_to");

-- CreateIndex
CREATE INDEX "vehicle_puc_details_status_idx" ON "vehicle_puc_details"("status");

-- CreateIndex
CREATE INDEX "vehicle_road_tax_details_vehicle_id_idx" ON "vehicle_road_tax_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_road_tax_details_paid_to_idx" ON "vehicle_road_tax_details"("paid_to");

-- CreateIndex
CREATE INDEX "vehicle_road_tax_details_status_idx" ON "vehicle_road_tax_details"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_fastag_details_vehicle_id_key" ON "vehicle_fastag_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_fastag_details_vehicle_id_idx" ON "vehicle_fastag_details"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_gps_device_details_vehicle_id_key" ON "vehicle_gps_device_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_gps_device_details_vehicle_id_idx" ON "vehicle_gps_device_details"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_compliance_documents_vehicle_id_idx" ON "vehicle_compliance_documents"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_compliance_documents_compliance_type_idx" ON "vehicle_compliance_documents"("compliance_type");

-- CreateIndex
CREATE INDEX "vehicle_compliance_documents_valid_to_idx" ON "vehicle_compliance_documents"("valid_to");

-- CreateIndex
CREATE INDEX "vehicle_compliance_documents_status_idx" ON "vehicle_compliance_documents"("status");

-- CreateIndex
CREATE INDEX "vehicle_compliance_history_vehicle_id_created_at_idx" ON "vehicle_compliance_history"("vehicle_id", "created_at");

-- CreateIndex
CREATE INDEX "vehicle_compliance_history_compliance_type_idx" ON "vehicle_compliance_history"("compliance_type");

-- CreateIndex
CREATE INDEX "vehicle_compliance_history_action_idx" ON "vehicle_compliance_history"("action");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendor_code_key" ON "vendors"("vendor_code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE UNIQUE INDEX "trip_billings_invoice_number_key" ON "trip_billings"("invoice_number");

-- CreateIndex
CREATE INDEX "trip_billings_customer_id_idx" ON "trip_billings"("customer_id");

-- CreateIndex
CREATE INDEX "trip_billings_vehicle_id_idx" ON "trip_billings"("vehicle_id");

-- CreateIndex
CREATE INDEX "trip_billings_driver_id_idx" ON "trip_billings"("driver_id");

-- CreateIndex
CREATE INDEX "trip_billings_payment_status_idx" ON "trip_billings"("payment_status");

-- CreateIndex
CREATE INDEX "trip_billings_invoice_number_idx" ON "trip_billings"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "trip_billings_trip_id_key" ON "trip_billings"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transactions_transaction_number_key" ON "finance_transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "finance_transactions_transaction_date_idx" ON "finance_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "finance_transactions_vehicle_id_idx" ON "finance_transactions"("vehicle_id");

-- CreateIndex
CREATE INDEX "finance_transactions_trip_id_idx" ON "finance_transactions"("trip_id");

-- CreateIndex
CREATE INDEX "finance_transactions_driver_id_idx" ON "finance_transactions"("driver_id");

-- CreateIndex
CREATE INDEX "finance_transactions_vendor_id_idx" ON "finance_transactions"("vendor_id");

-- CreateIndex
CREATE INDEX "finance_transactions_customer_id_idx" ON "finance_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "finance_transactions_source_module_idx" ON "finance_transactions"("source_module");

-- CreateIndex
CREATE INDEX "finance_transactions_payment_status_idx" ON "finance_transactions"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_payment_number_key" ON "payment_records"("payment_number");

-- CreateIndex
CREATE INDEX "payment_records_transaction_id_idx" ON "payment_records"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_records_trip_billing_id_idx" ON "payment_records"("trip_billing_id");

-- CreateIndex
CREATE INDEX "payment_records_payment_date_idx" ON "payment_records"("payment_date");

-- CreateIndex
CREATE INDEX "payment_records_payment_number_idx" ON "payment_records"("payment_number");

-- CreateIndex
CREATE INDEX "finance_history_entity_type_entity_id_idx" ON "finance_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "finance_history_created_at_idx" ON "finance_history"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_current_driver_id_fkey" FOREIGN KEY ("current_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_category_id_fkey" FOREIGN KEY ("asset_category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_assistant_driver_id_fkey" FOREIGN KEY ("assistant_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_history" ADD CONSTRAINT "trip_history_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_history" ADD CONSTRAINT "trip_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_registration_details" ADD CONSTRAINT "vehicle_registration_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_insurance_details" ADD CONSTRAINT "vehicle_insurance_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_permit_details" ADD CONSTRAINT "vehicle_permit_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fitness_details" ADD CONSTRAINT "vehicle_fitness_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_puc_details" ADD CONSTRAINT "vehicle_puc_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_road_tax_details" ADD CONSTRAINT "vehicle_road_tax_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fastag_details" ADD CONSTRAINT "vehicle_fastag_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_gps_device_details" ADD CONSTRAINT "vehicle_gps_device_details_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_documents" ADD CONSTRAINT "vehicle_compliance_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_documents" ADD CONSTRAINT "vehicle_compliance_documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_history" ADD CONSTRAINT "vehicle_compliance_history_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_compliance_history" ADD CONSTRAINT "vehicle_compliance_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_trip_billing_id_fkey" FOREIGN KEY ("trip_billing_id") REFERENCES "trip_billings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_history" ADD CONSTRAINT "finance_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
