-- =========================================================================
-- TORQUE AUTO ADVISOR - MASTER SUPABASE DATABASE MIGRATION SCRIPT
-- Generated at: 2026-09-12T11:11:48.198Z
-- This script contains:
--   1. Database Extensions
--   2. Complete Table Schemas (DDL), Primary Keys & Foreign Keys
--   3. Authentication Data (auth.users, auth.identities) for instant login
--   4. All Public Table Data (Roles, Users, Permissions, Leads, Policies, etc.)
--   5. Supabase Storage Bucket Configuration
--   6. Database Automation Functions & Triggers
--   7. Row Level Security (RLS) Policies
-- =========================================================================

-- ─── STEP 0: DISABLE FOREIGN KEYS & TRIGGERS TEMPORARILY ─────────────────
SET session_replication_role = 'replica';

-- ─── STEP 1: ENABLE REQUIRED EXTENSIONS ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── STEP 2: SCHEMA DEFINITION (TABLES, COLUMNS & CONSTRAINTS) ──────────
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expoPushToken" TEXT,
    "highestQualification" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "joiningDate" TIMESTAMP(3),
    "personalMobile" TEXT,
    "homeMobile" TEXT,
    "onboardingRemark" TEXT,
    "onboardingUpdated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" UUID,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "leads" (
    "id" UUID NOT NULL,
    "assignedTo" UUID,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "registrationDate" TIMESTAMP(3),
    "gvw" TEXT,
    "address" TEXT,
    "messageTemplate" TEXT,
    "existingAgent" TEXT,
    "city" TEXT,
    "importName" TEXT,
    "customFields" JSONB DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "policies" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "policyNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "premiumAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "quotations" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "createdBy" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "details" JSONB,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rate" DECIMAL(12,2),
    "benefit" DECIMAL(12,2),
    "companyId" UUID,
    "categoryId" UUID,
    "netPremium" DECIMAL(12,2),
    "totalPremium" DECIMAL(12,2),
    "percentage" DECIMAL(5,2),
    "profit" DECIMAL(12,2),

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "calls" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'outbound',
    "outcome" TEXT NOT NULL,
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "follow_ups" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "assignedTo" UUID,
    "leadName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'call',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "claims" (
    "id" UUID NOT NULL,
    "policyId" UUID,
    "leadId" UUID,
    "assignedTo" UUID,
    "customerName" TEXT NOT NULL,
    "policyNumber" TEXT,
    "vehicleNumber" TEXT,
    "claimType" TEXT,
    "claimAmount" DECIMAL(12,2),
    "approvedAmount" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'filed',
    "incidentDate" TIMESTAMP(3),
    "filedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledDate" TIMESTAMP(3),
    "description" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "leadId" UUID,
    "policyId" UUID,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "loans" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "assignedTo" UUID,
    "customerName" TEXT NOT NULL,
    "loanType" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "tenureMonths" INTEGER,
    "interestRate" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'applied',
    "conversionStatus" TEXT NOT NULL DEFAULT 'Applied',
    "bankName" TEXT,
    "disbursementDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rto_work" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "assignedTo" UUID,
    "customerName" TEXT NOT NULL,
    "vehicleNumber" TEXT,
    "workType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rtoOffice" TEXT,
    "fees" DECIMAL(12,2),
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    "paymentAmount" DECIMAL(12,2),
    "paymentDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rto_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fitness_work" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "assignedTo" UUID,
    "customerName" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "testDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "fees" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitness_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "documents" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'pending',
    "totalRevenue" DECIMAL(12,2),
    "lastSaleDate" TIMESTAMP(3),
    "policyCount" INTEGER NOT NULL DEFAULT 0,
    "loanCount" INTEGER NOT NULL DEFAULT 0,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visits" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "leadId" UUID,
    "userId" UUID,
    "purpose" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "location" TEXT,
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,
    "endLat" DOUBLE PRECISION,
    "endLng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "gpsTrail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "data_change_requests" (
    "id" UUID NOT NULL,
    "requestedBy" UUID NOT NULL,
    "reviewedBy" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "data_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_assignments" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_whatsapp_logs" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lead_status_history" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "notes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "predefined_responses" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predefined_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "attendance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "salaries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_tables" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "basePremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_rules" (
    "id" UUID NOT NULL,
    "rateTableId" UUID NOT NULL,
    "condition" TEXT NOT NULL,
    "modifierType" TEXT NOT NULL,
    "modifierValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "addons" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'flat',
    "priceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "company_details" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "category_details" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "quotation_relationship_details" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "profit" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "addedBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_relationship_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "renewal_records" (
    "id" UUID NOT NULL,
    "leadId" UUID,
    "policyId" UUID,
    "vehicleNo" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "policyNumber" TEXT,
    "provider" TEXT,
    "policyType" TEXT,
    "premiumAmount" DECIMAL(12,2),
    "policyStartDate" TIMESTAMP(3),
    "policyEndDate" TIMESTAMP(3) NOT NULL,
    "documents" JSONB,
    "customData" JSONB,
    "assignedTo" UUID,
    "assignedMonth" INTEGER,
    "assignedYear" INTEGER,
    "renewalStatus" TEXT NOT NULL DEFAULT 'Active',
    "renewedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "createdBySalesId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renewal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_RolePermissions" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_RolePermissions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_UserPermissions" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_UserPermissions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_assignedTo_idx" ON "leads"("assignedTo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_clientPhone_idx" ON "leads"("clientPhone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_clientEmail_idx" ON "leads"("clientEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_importName_idx" ON "leads"("importName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_deletedAt_idx" ON "leads"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "policies_policyNumber_key" ON "policies"("policyNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "policies_status_idx" ON "policies"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "policies_endDate_idx" ON "policies"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "quotations_shareToken_key" ON "quotations"("shareToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "follow_ups_status_idx" ON "follow_ups"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "follow_ups_scheduledAt_idx" ON "follow_ups"("scheduledAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "documents_entityType_entityId_idx" ON "documents"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "data_change_requests_status_idx" ON "data_change_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "data_change_requests_entityType_entityId_idx" ON "data_change_requests"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "predefined_responses_text_key" ON "predefined_responses"("text");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_userId_date_key" ON "attendance"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "salaries_userId_month_year_key" ON "salaries"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "company_details_name_key" ON "company_details"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "category_details_name_key" ON "category_details"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "quotation_relationship_details_companyId_categoryId_status_key" ON "quotation_relationship_details"("companyId", "categoryId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "renewal_records_renewalStatus_idx" ON "renewal_records"("renewalStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "renewal_records_policyEndDate_idx" ON "renewal_records"("policyEndDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "renewal_records_assignedTo_idx" ON "renewal_records"("assignedTo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_RolePermissions_B_index" ON "_RolePermissions"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_UserPermissions_B_index" ON "_UserPermissions"("B");

-- AddForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_managerId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_roleId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_assignedTo_fkey";
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" DROP CONSTRAINT IF EXISTS "policies_leadId_fkey";
ALTER TABLE "policies" ADD CONSTRAINT "policies_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_createdBy_fkey";
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_leadId_fkey";
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_companyId_fkey";
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_categoryId_fkey";
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" DROP CONSTRAINT IF EXISTS "calls_leadId_fkey";
ALTER TABLE "calls" ADD CONSTRAINT "calls_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" DROP CONSTRAINT IF EXISTS "calls_userId_fkey";
ALTER TABLE "calls" ADD CONSTRAINT "calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" DROP CONSTRAINT IF EXISTS "follow_ups_assignedTo_fkey";
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" DROP CONSTRAINT IF EXISTS "follow_ups_leadId_fkey";
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_assignedTo_fkey";
ALTER TABLE "claims" ADD CONSTRAINT "claims_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_leadId_fkey";
ALTER TABLE "claims" ADD CONSTRAINT "claims_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" DROP CONSTRAINT IF EXISTS "claims_policyId_fkey";
ALTER TABLE "claims" ADD CONSTRAINT "claims_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_policyId_fkey";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_userId_fkey";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_assignedTo_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "loans_leadId_fkey";
ALTER TABLE "loans" ADD CONSTRAINT "loans_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rto_work" DROP CONSTRAINT IF EXISTS "rto_work_assignedTo_fkey";
ALTER TABLE "rto_work" ADD CONSTRAINT "rto_work_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rto_work" DROP CONSTRAINT IF EXISTS "rto_work_leadId_fkey";
ALTER TABLE "rto_work" ADD CONSTRAINT "rto_work_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitness_work" DROP CONSTRAINT IF EXISTS "fitness_work_assignedTo_fkey";
ALTER TABLE "fitness_work" ADD CONSTRAINT "fitness_work_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitness_work" DROP CONSTRAINT IF EXISTS "fitness_work_leadId_fkey";
ALTER TABLE "fitness_work" ADD CONSTRAINT "fitness_work_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_userId_fkey";
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_uploadedBy_fkey";
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_leadId_fkey";
ALTER TABLE "customers" ADD CONSTRAINT "customers_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_customerId_fkey";
ALTER TABLE "visits" ADD CONSTRAINT "visits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_leadId_fkey";
ALTER TABLE "visits" ADD CONSTRAINT "visits_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_userId_fkey";
ALTER TABLE "visits" ADD CONSTRAINT "visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_change_requests" DROP CONSTRAINT IF EXISTS "data_change_requests_requestedBy_fkey";
ALTER TABLE "data_change_requests" ADD CONSTRAINT "data_change_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_change_requests" DROP CONSTRAINT IF EXISTS "data_change_requests_reviewedBy_fkey";
ALTER TABLE "data_change_requests" ADD CONSTRAINT "data_change_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" DROP CONSTRAINT IF EXISTS "lead_assignments_leadId_fkey";
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" DROP CONSTRAINT IF EXISTS "lead_assignments_userId_fkey";
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_whatsapp_logs" DROP CONSTRAINT IF EXISTS "lead_whatsapp_logs_leadId_fkey";
ALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_whatsapp_logs" DROP CONSTRAINT IF EXISTS "lead_whatsapp_logs_userId_fkey";
ALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_history" DROP CONSTRAINT IF EXISTS "lead_status_history_leadId_fkey";
ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_history" DROP CONSTRAINT IF EXISTS "lead_status_history_userId_fkey";
ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_userId_fkey";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT IF EXISTS "leave_requests_approvedBy_fkey";
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT IF EXISTS "leave_requests_userId_fkey";
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salaries" DROP CONSTRAINT IF EXISTS "salaries_userId_fkey";
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_rules" DROP CONSTRAINT IF EXISTS "rate_rules_rateTableId_fkey";
ALTER TABLE "rate_rules" ADD CONSTRAINT "rate_rules_rateTableId_fkey" FOREIGN KEY ("rateTableId") REFERENCES "rate_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_relationship_details" DROP CONSTRAINT IF EXISTS "quotation_relationship_details_companyId_fkey";
ALTER TABLE "quotation_relationship_details" ADD CONSTRAINT "quotation_relationship_details_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_relationship_details" DROP CONSTRAINT IF EXISTS "quotation_relationship_details_categoryId_fkey";
ALTER TABLE "quotation_relationship_details" ADD CONSTRAINT "quotation_relationship_details_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_records" DROP CONSTRAINT IF EXISTS "renewal_records_leadId_fkey";
ALTER TABLE "renewal_records" ADD CONSTRAINT "renewal_records_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_records" DROP CONSTRAINT IF EXISTS "renewal_records_policyId_fkey";
ALTER TABLE "renewal_records" ADD CONSTRAINT "renewal_records_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_records" DROP CONSTRAINT IF EXISTS "renewal_records_assignedTo_fkey";
ALTER TABLE "renewal_records" ADD CONSTRAINT "renewal_records_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_records" DROP CONSTRAINT IF EXISTS "renewal_records_createdBySalesId_fkey";
ALTER TABLE "renewal_records" ADD CONSTRAINT "renewal_records_createdBySalesId_fkey" FOREIGN KEY ("createdBySalesId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissions" DROP CONSTRAINT IF EXISTS "_RolePermissions_A_fkey";
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissions" DROP CONSTRAINT IF EXISTS "_RolePermissions_B_fkey";
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPermissions" DROP CONSTRAINT IF EXISTS "_UserPermissions_A_fkey";
ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPermissions" DROP CONSTRAINT IF EXISTS "_UserPermissions_B_fkey";
ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Table addons
CREATE TABLE IF NOT EXISTS "addons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceType" TEXT NOT NULL DEFAULT 'flat',
    "priceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

-- Table predefined_responses
CREATE TABLE IF NOT EXISTS "predefined_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "predefined_responses_pkey" PRIMARY KEY ("id")
);

-- Table system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");


-- ─── STEP 3: SUPABASE AUTHENTICATION ACCOUNTS (auth.users & auth.identities) ─
-- This restores all login credentials, encrypted passwords, and user IDs.

-- Table "auth"."users": 14 rows
INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous")
VALUES
  ('00000000-0000-0000-0000-000000000000', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'authenticated', 'authenticated', 'test@gmail.com', '$2a$10$kLRSe4Rg9EZlG8gA6/zxLOi5b17yW5bqJy1MAAwXj6btQos8zoFTm', '2026-09-12T07:44:02.337Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-09-12T07:44:09.496Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"jiya ","email_verified":true}'::jsonb, NULL, '2026-09-12T07:44:02.326Z'::timestamptz, '2026-09-12T09:06:00.359Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', 'cdae57e6-a5b1-4be7-9264-127d51acecdf', 'authenticated', 'authenticated', 'hr1@torque.in', '$2a$10$e/ImfEWtWzjm.WG9hBPLi.zjddDMEAH6u4fu0UeV1A.7E2zl2MuN6', '2026-08-17T18:22:59.795Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-09-12T09:57:15.578Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"HR 1","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:31.068Z'::timestamptz, '2026-09-12T09:57:15.598Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '37a211dd-6829-4b97-99e7-7fee3f5d9818', 'authenticated', 'authenticated', 'manager2@torque.in', '$2a$10$hPSP3ONm1ks07kxnjAF0mux0p.65pdGoZ7Zz1z7d3sJMPP5qa58F.', '2026-08-17T18:22:59.481Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-27T08:59:16.409Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Manager 2","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:29.386Z'::timestamptz, '2026-08-27T08:59:16.412Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '2b56ea7e-5cb0-4059-878d-6cc2b628c543', 'authenticated', 'authenticated', 'manager1@torque.in', '$2a$10$jA8GssS/geNXDgEHcawGG.cpP9OeMnAtnwRBrFAb3//oRJUgcYOn2', '2026-08-17T18:22:59.267Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-09-12T10:38:16.356Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Manager 1","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:28.946Z'::timestamptz, '2026-09-12T10:38:16.384Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '5c25b152-c8aa-442d-83a6-a39d0b2f80ad', 'authenticated', 'authenticated', 'blochmustafa052@gmail.com', '$2a$10$bY7mgD2hvUZ9s4U1W2nizub/21qv7bw9CyowbVdH0zh02CX/hfOI6', '2026-09-12T05:40:55.934Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"Sales Executive","full_name":"MUSTAFA BLOCH","email_verified":true}'::jsonb, NULL, '2026-09-12T05:40:55.903Z'::timestamptz, '2026-09-12T06:28:12.183Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', 'authenticated', 'authenticated', 'sales1@torque.in', '$2a$10$SzVLiJexGSK24g3NJJo38eGt1xfH0FwWzszy1U2ecjY.sKLhuag/e', '2026-08-17T18:23:00.330Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-09-12T07:30:51.381Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales 1","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:29.708Z'::timestamptz, '2026-09-12T10:56:16.113Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '04f990e7-9d7f-4eec-ba66-843c90f3a599', 'authenticated', 'authenticated', 'torquecrm28@gmail.com', '$2a$10$hyEEHf2OojxxzrVeH0hMAust5HSVpzFGHpLeRbjAJ9oibjszPJlcu', '2026-09-12T07:20:58.436Z'::timestamptz, NULL, '', NULL, 'cd49fe456b5d664853cfd11a462622e4995651061b4750da9dc95125', '2026-09-12T07:39:55.415Z'::timestamptz, '', '', NULL, '2026-09-12T07:21:09.588Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Payal","email_verified":true}'::jsonb, NULL, '2026-09-12T07:20:58.426Z'::timestamptz, '2026-09-12T07:39:55.418Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', 'authenticated', 'authenticated', 'sales2@torque.in', '$2a$10$ka2v3zO38zdugafuu5gYCO54uejMmOLDmfJ1MonOcVrHaqx.kNXJe', '2026-08-17T18:23:00.577Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales 2","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:30.093Z'::timestamptz, '2026-08-17T18:23:00.578Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '3c1e8734-ac95-4790-90c5-74d9479b1322', 'authenticated', 'authenticated', 'sales3@torque.in', '$2a$10$Zyrb6XfgKJif2.CLyEDQ7O6IN4LPb3T1d//a9Hu08YB3Ev4Zqy8f.', '2026-08-17T18:23:00.733Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales 3","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:30.491Z'::timestamptz, '2026-08-17T18:23:00.737Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', 'authenticated', 'authenticated', 'sales4@torque.in', '$2a$10$bKWPJ9kvxLS15MzXlfPiguGFKyoLv5jog4kwKqVNlG761sORawfba', '2026-08-17T18:23:00.964Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales 4","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:30.750Z'::timestamptz, '2026-08-17T18:23:00.965Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '38e38ca2-51a3-4f37-a541-ddad677353d9', 'authenticated', 'authenticated', 'accountant1@torque.in', '$2a$10$FAXfHyK7gpaZLRY3Za1j1.K.LHpUKe.sRuR1quitz80/Ntb2/Z6Ru', '2026-08-17T18:23:00.098Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Accountant 1","email_verified":true}'::jsonb, NULL, '2026-08-17T18:21:31.412Z'::timestamptz, '2026-08-17T18:23:00.099Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', 'fc1dcbb6-8430-418d-afbe-4474dc212286', 'authenticated', 'authenticated', 'angelinsurance18@gmail.com', '$2a$10$2MbTgRf1SnXGsx1xspzvc.mjv4Beu2v6YF/U6vH1pOR1pEOVA4UWm', '2026-09-12T10:52:11.283Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-09-12T10:54:56.772Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Divyaba","email_verified":true}'::jsonb, NULL, '2026-09-12T10:52:11.256Z'::timestamptz, '2026-09-12T10:55:11.158Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
  ('00000000-0000-0000-0000-000000000000', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'authenticated', 'authenticated', 'krishnatorque055@gmail.com', '$2a$10$a8jlQlwHJwmhbdWJD4.4kOOigbBf1dREJZdcOWAU0Z1JU243UbU4S', '2026-09-12T07:28:49.537Z'::timestamptz, NULL, '', NULL, '', NULL, '', '', NULL, '2026-09-12T10:58:03.656Z'::timestamptz, '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"Sales Executive","full_name":"Krishna","email_verified":true}'::jsonb, NULL, '2026-09-12T07:28:49.528Z'::timestamptz, '2026-09-12T10:58:03.660Z'::timestamptz, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, FALSE, NULL, FALSE),
ON CONFLICT DO NOTHING;

-- Ensure torqueautoadvisor@gmail.com password is Perin@3623 even if row already existed
UPDATE "auth"."users"
SET "encrypted_password" = '$2a$10$xAqmudt1zNB3K9MS/eNhq.C28AJvFVFLJgqIT/32l1z6t6Hk8GVr.'
WHERE "email" = 'torqueautoadvisor@gmail.com';

-- Table "auth"."identities": 14 rows
INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id")
VALUES
  ('8e65083f-6c19-478b-93a4-b8ba4fa16ddf', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', '{"sub":"8e65083f-6c19-478b-93a4-b8ba4fa16ddf","email":"torqueautoadvisor@gmail.com","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-05T11:49:38.627Z'::timestamptz, '2026-08-05T11:49:38.627Z'::timestamptz, '2026-08-05T11:49:38.627Z'::timestamptz, '6fda1ad9-586f-4c37-ad68-26ea4fb8d4dd'),
  ('2b56ea7e-5cb0-4059-878d-6cc2b628c543', '2b56ea7e-5cb0-4059-878d-6cc2b628c543', '{"sub":"2b56ea7e-5cb0-4059-878d-6cc2b628c543","email":"manager1@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:28.952Z'::timestamptz, '2026-08-17T18:21:28.952Z'::timestamptz, '2026-08-17T18:21:28.952Z'::timestamptz, 'fa203b00-5d3a-450f-a8b7-c045e85ef8fb'),
  ('37a211dd-6829-4b97-99e7-7fee3f5d9818', '37a211dd-6829-4b97-99e7-7fee3f5d9818', '{"sub":"37a211dd-6829-4b97-99e7-7fee3f5d9818","email":"manager2@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:29.387Z'::timestamptz, '2026-08-17T18:21:29.387Z'::timestamptz, '2026-08-17T18:21:29.387Z'::timestamptz, 'e2f25e69-71a1-4f2c-960f-1e2c97e6bdfc'),
  ('8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '{"sub":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","email":"sales1@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:29.709Z'::timestamptz, '2026-08-17T18:21:29.709Z'::timestamptz, '2026-08-17T18:21:29.709Z'::timestamptz, '9a7322e0-b8e4-4db4-bde1-4c72f8faaed9'),
  ('5e6a8c0e-a60c-4741-b280-f7cac79e029c', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', '{"sub":"5e6a8c0e-a60c-4741-b280-f7cac79e029c","email":"sales2@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:30.094Z'::timestamptz, '2026-08-17T18:21:30.094Z'::timestamptz, '2026-08-17T18:21:30.094Z'::timestamptz, 'c85db627-b5e5-4810-9592-90ef133124b9'),
  ('3c1e8734-ac95-4790-90c5-74d9479b1322', '3c1e8734-ac95-4790-90c5-74d9479b1322', '{"sub":"3c1e8734-ac95-4790-90c5-74d9479b1322","email":"sales3@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:30.492Z'::timestamptz, '2026-08-17T18:21:30.492Z'::timestamptz, '2026-08-17T18:21:30.492Z'::timestamptz, '88a9b4be-da35-4d52-be3c-926fdca82868'),
  ('57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', '{"sub":"57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b","email":"sales4@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:30.751Z'::timestamptz, '2026-08-17T18:21:30.751Z'::timestamptz, '2026-08-17T18:21:30.751Z'::timestamptz, 'f9933ff7-e5e8-4919-885a-7df472974dd4'),
  ('cdae57e6-a5b1-4be7-9264-127d51acecdf', 'cdae57e6-a5b1-4be7-9264-127d51acecdf', '{"sub":"cdae57e6-a5b1-4be7-9264-127d51acecdf","email":"hr1@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:31.069Z'::timestamptz, '2026-08-17T18:21:31.069Z'::timestamptz, '2026-08-17T18:21:31.069Z'::timestamptz, '606f1840-70b7-4dab-bf6f-08398e1350fa'),
  ('38e38ca2-51a3-4f37-a541-ddad677353d9', '38e38ca2-51a3-4f37-a541-ddad677353d9', '{"sub":"38e38ca2-51a3-4f37-a541-ddad677353d9","email":"accountant1@torque.in","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-08-17T18:21:31.413Z'::timestamptz, '2026-08-17T18:21:31.413Z'::timestamptz, '2026-08-17T18:21:31.413Z'::timestamptz, '832ab821-210e-4a05-9b85-05df11363025'),
  ('5c25b152-c8aa-442d-83a6-a39d0b2f80ad', '5c25b152-c8aa-442d-83a6-a39d0b2f80ad', '{"sub":"5c25b152-c8aa-442d-83a6-a39d0b2f80ad","email":"blochmustafa052@gmail.com","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-09-12T05:40:55.925Z'::timestamptz, '2026-09-12T05:40:55.925Z'::timestamptz, '2026-09-12T05:40:55.925Z'::timestamptz, 'be954f43-c7ad-487a-ac7c-e93c9877c395'),
  ('04f990e7-9d7f-4eec-ba66-843c90f3a599', '04f990e7-9d7f-4eec-ba66-843c90f3a599', '{"sub":"04f990e7-9d7f-4eec-ba66-843c90f3a599","email":"torquecrm28@gmail.com","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-09-12T07:20:58.432Z'::timestamptz, '2026-09-12T07:20:58.432Z'::timestamptz, '2026-09-12T07:20:58.432Z'::timestamptz, '73535e7e-9ae2-45d1-b569-54845ce84575'),
  ('0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '{"sub":"0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a","email":"krishnatorque055@gmail.com","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-09-12T07:28:49.532Z'::timestamptz, '2026-09-12T07:28:49.532Z'::timestamptz, '2026-09-12T07:28:49.532Z'::timestamptz, 'f6fbd940-c061-451e-b096-958502eb920b'),
  ('c9141a42-f10f-414f-9fc7-aa736e921454', 'c9141a42-f10f-414f-9fc7-aa736e921454', '{"sub":"c9141a42-f10f-414f-9fc7-aa736e921454","email":"test@gmail.com","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-09-12T07:44:02.334Z'::timestamptz, '2026-09-12T07:44:02.334Z'::timestamptz, '2026-09-12T07:44:02.334Z'::timestamptz, '44053599-bfae-4e47-8da5-feeac84a816e'),
  ('fc1dcbb6-8430-418d-afbe-4474dc212286', 'fc1dcbb6-8430-418d-afbe-4474dc212286', '{"sub":"fc1dcbb6-8430-418d-afbe-4474dc212286","email":"angelinsurance18@gmail.com","email_verified":false,"phone_verified":false}'::jsonb, 'email', '2026-09-12T10:52:11.277Z'::timestamptz, '2026-09-12T10:52:11.277Z'::timestamptz, '2026-09-12T10:52:11.277Z'::timestamptz, '48721db0-6fcc-4285-bbef-0e980f93e413')
ON CONFLICT DO NOTHING;

-- ─── STEP 4: PUBLIC DATABASE TABLES DATA ──────────────────────────────────

-- Table "public"."roles": 12 rows
INSERT INTO "public"."roles" ("id", "name", "description")
VALUES
  ('79721d05-5251-44e5-8fea-de18a4f1e206', 'Super Admin', NULL),
  ('e351bdb6-3971-4737-9085-5c4bb9a65b0a', 'Admin', NULL),
  ('91d011bf-75b1-417f-8f6f-e7eaef1d0804', 'Manager', NULL),
  ('27fd79aa-c2f1-4369-91b1-40e5bd086553', 'Sales Executive', NULL),
  ('e00e4d57-e299-44de-9884-7bc26d41be46', 'Field Executive', NULL),
  ('93f25e27-b6fa-4965-b5be-fc2a18ede279', 'RTO Executive', NULL),
  ('8323a39d-0dfb-4f2d-88ca-fb948cedd0b1', 'Claims Executive', NULL),
  ('faa2d2ca-0c8c-4598-941c-0200f56eff73', 'Loan Executive', NULL),
  ('5d383603-29ba-46c0-981e-5ce2427ecb01', 'CRM Executive', NULL),
  ('31fcb39f-5ff7-45fc-915d-0b6839160386', 'Accountant', NULL),
  ('530453e1-a746-47a9-a69c-bd8015e1626f', 'HR Manager', NULL),
  ('e479ef4d-e282-4941-9f5a-64b259c38259', 'Viewer', NULL)
ON CONFLICT DO NOTHING;

-- Table "public"."permissions": 119 rows
INSERT INTO "public"."permissions" ("id", "name", "description")
VALUES
  ('51305b89-5e7a-480d-9813-596f72666e9f', 'auth.login', 'Can login auth'),
  ('2852394e-a829-40cc-9043-91bd1550de99', 'auth.logout', 'Can logout auth'),
  ('fbfc98c2-899d-4cb8-b45c-b031aa242789', 'auth.pin_setup', 'Can pin_setup auth'),
  ('ab5040a6-eaa7-4ff1-867f-7cae495401aa', 'auth.biometric_enable', 'Can biometric_enable auth'),
  ('e5d81f45-60f6-453d-bec5-0aa02e2f3ee5', 'auth.session_manage', 'Can session_manage auth'),
  ('70c5e75e-8fe3-4e47-ae81-2cd2667c8d19', 'auth.reset_access', 'Can reset_access auth'),
  ('0aeac8f2-9e22-4f8d-bff1-9107ce08e539', 'role.view', 'Can view role'),
  ('7bf2504c-9e2b-464f-a0c4-260d15f53528', 'role.create', 'Can create role'),
  ('4d197e92-9d4b-4426-87d9-57b5303b0c28', 'role.edit', 'Can edit role'),
  ('877289ef-759d-427e-a6bb-b1563c14ee8c', 'role.delete', 'Can delete role'),
  ('117d0eb6-8c5e-4145-ac53-ae74fd8a5295', 'role.assign_permissions', 'Can assign_permissions role'),
  ('aee31966-a865-41f9-9f0d-ef4d3a28a9bb', 'role.manage_users', 'Can manage_users role'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', 'lead.view', 'Can view lead'),
  ('7f0ef813-f33f-49a5-b10b-c251a16ade4d', 'lead.create', 'Can create lead'),
  ('5b38be20-6eaf-428f-af53-b950d3e6efa3', 'lead.edit', 'Can edit lead'),
  ('221f8c39-7478-43b1-a886-9b45b62e5cc0', 'lead.delete', 'Can delete lead'),
  ('fb85f2f9-bdb1-440c-8efe-36510d25594d', 'lead.assign', 'Can assign lead'),
  ('b1c2ea73-c98a-404a-997a-e9ee2d0202b9', 'lead.import', 'Can import lead'),
  ('50f78a06-bbc3-42b0-ba5c-a09ce8d1d6ce', 'lead.export', 'Can export lead'),
  ('374ae43c-8013-4f20-a004-483a99854229', 'lead.change_status', 'Can change_status lead'),
  ('9091087b-3271-4087-a435-239c830ad2e4', 'rate.view', 'Can view rate'),
  ('57aff330-6fbd-4a4a-a04b-5e653f0c5034', 'rate.calculate', 'Can calculate rate'),
  ('91b8ac6e-e85e-440d-8f60-d07c894effa5', 'rate.edit_rules', 'Can edit_rules rate'),
  ('9cc2e9ed-1d9f-4e9a-9beb-bc20ffa4a572', 'rate.manage_addons', 'Can manage_addons rate'),
  ('40daa1fc-b870-428a-9c7c-90321747c429', 'rate.configure_tables', 'Can configure_tables rate'),
  ('ed551e0d-f606-474e-b493-f64b1d92d652', 'rate.export', 'Can export rate'),
  ('6f2576c1-1e8b-4e3e-b6f3-46c9fa84463b', 'rto.view', 'Can view rto'),
  ('80baa2ea-7634-4b67-bb5b-05275e759910', 'rto.create', 'Can create rto'),
  ('6e4ef49f-b9a5-4721-b57f-195500a7695c', 'rto.edit', 'Can edit rto'),
  ('2c306036-3194-493e-a22d-80d3feec067e', 'rto.delete', 'Can delete rto'),
  ('c4eb2935-ef65-40ef-9f91-bacdeb39a87a', 'rto.update_status', 'Can update_status rto'),
  ('c6e82a7e-b144-41cc-b602-07366695fc66', 'rto.track_payment', 'Can track_payment rto'),
  ('84cf5b82-6018-437d-967e-347a5d14cd52', 'vahan.view', 'Can view vahan'),
  ('2c927d1b-4848-48b3-8a9a-f664e3067af0', 'vahan.create', 'Can create vahan'),
  ('3b207a9e-7514-4686-9991-851013feca06', 'vahan.edit', 'Can edit vahan'),
  ('a1123f3e-a780-4a68-a0dc-29d0a7d7fdce', 'vahan.delete', 'Can delete vahan'),
  ('265deadc-100c-4df7-86da-919a42dc71c3', 'vahan.update_status', 'Can update_status vahan'),
  ('0fbbdc50-ba46-4bbe-8eb9-977f4bf0807c', 'vahan.track_payment', 'Can track_payment vahan'),
  ('827659fb-784b-4fa0-affa-e2fea1e79df5', 'fitness.view', 'Can view fitness'),
  ('11f84a8a-4e60-4bce-bb2f-7efbd45f12eb', 'fitness.create', 'Can create fitness'),
  ('65a72590-282f-462a-a9c8-ba5bf3c1055a', 'fitness.edit', 'Can edit fitness'),
  ('55792f22-0f9f-45b2-b081-bc59d5ad564b', 'fitness.delete', 'Can delete fitness'),
  ('f58c672b-a2a4-4835-9b68-0521206b923d', 'fitness.update_status', 'Can update_status fitness'),
  ('1e2db7cc-b28c-415a-b9bd-9a9e7cab6ff4', 'fitness.track_payment', 'Can track_payment fitness'),
  ('7a122720-dc68-4e8c-8b67-ac13f12a8cb3', 'claims.view', 'Can view claims'),
  ('0f7cabf9-3a75-4fe7-bb34-fa32bf6e5076', 'claims.create', 'Can create claims'),
  ('581bc13c-8332-4849-852c-4220b1b5778d', 'claims.edit', 'Can edit claims'),
  ('c8f67558-4919-4a83-887e-0fb4414b537e', 'claims.delete', 'Can delete claims'),
  ('863b1977-a38f-4cb4-aa67-50deae370a5e', 'claims.update_status', 'Can update_status claims'),
  ('428d035b-5bf2-4862-ac12-1a51bfd737b8', 'claims.upload_documents', 'Can upload_documents claims'),
  ('4a2404b3-c571-422c-bc5e-ed34d9c1f3f6', 'accounts.view', 'Can view accounts'),
  ('89b4c6bf-406a-4086-9b09-baf4b076649b', 'accounts.create_entry', 'Can create_entry accounts'),
  ('3cc8a38c-63c5-4c30-aa62-9789dde7855c', 'accounts.edit_entry', 'Can edit_entry accounts'),
  ('305d0e8e-f81a-4dbb-9329-17297fd31c40', 'accounts.delete_entry', 'Can delete_entry accounts'),
  ('abf3ee95-bff5-495d-a8f2-9850b3c36630', 'accounts.view_reports', 'Can view_reports accounts'),
  ('2f134a6e-1a75-4804-b298-ccd51c754c60', 'accounts.export', 'Can export accounts'),
  ('40ef733a-97ac-4f3f-a56c-42f20ed42b1a', 'accounts.manage_salary', 'Can manage_salary accounts'),
  ('dd56af8c-7b2a-41f2-901f-e54bbe7a3969', 'hr.view', 'Can view hr'),
  ('6595c861-cc0e-486b-8329-6b370c67b3b4', 'hr.create', 'Can create hr'),
  ('977cbd60-3093-4edc-ada4-9c8db557e739', 'hr.edit', 'Can edit hr'),
  ('d3cfe41c-2e8e-495b-917e-59423eca168b', 'hr.delete', 'Can delete hr'),
  ('6793a2ce-6765-4589-b2eb-28e0375847df', 'hr.manage_attendance', 'Can manage_attendance hr'),
  ('1b7d1243-453b-4f5a-b106-18018afaaf29', 'hr.manage_leave', 'Can manage_leave hr'),
  ('7b7e2fd2-01c0-4681-a13c-272646f10e2b', 'hr.view_performance', 'Can view_performance hr'),
  ('4b842bec-b260-4bc7-8a05-554c0b9b6171', 'loan.view', 'Can view loan'),
  ('f9132a85-65d9-4841-ab56-38897ca7223c', 'loan.create', 'Can create loan'),
  ('8ee5496d-6d3a-4c54-a912-f66b462ec600', 'loan.edit', 'Can edit loan'),
  ('422bd90c-35e9-4f1e-9bb5-269b81ed0c79', 'loan.delete', 'Can delete loan'),
  ('ec427542-cd99-43fe-8b23-128b0e0219b8', 'loan.update_status', 'Can update_status loan'),
  ('3bbb38b0-7d6e-4251-8061-1f039171e2ff', 'loan.track_conversion', 'Can track_conversion loan'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', 'crm.view', 'Can view crm'),
  ('4ccef598-0ffb-4fa3-8da8-58ab656d150c', 'crm.create', 'Can create crm'),
  ('46e7c143-23ec-417d-900d-1edf87f102f6', 'crm.edit', 'Can edit crm'),
  ('ec01f3e2-9d29-4a3c-943f-a21e51d69e0b', 'crm.delete', 'Can delete crm'),
  ('6045686f-db0a-4982-88e3-fdcad6893751', 'crm.manage_followups', 'Can manage_followups crm'),
  ('ee21134a-1e4b-44cb-b524-34e5f66da070', 'crm.view_revenue', 'Can view_revenue crm'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', 'visit.view', 'Can view visit'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', 'visit.create', 'Can create visit'),
  ('861d3c6a-6184-4357-b806-f837f5804781', 'visit.edit', 'Can edit visit'),
  ('0bc2b80c-a26a-462d-82b5-872a935c989b', 'visit.delete', 'Can delete visit'),
  ('e87d7187-053f-4586-9efd-482e2f947e69', 'visit.track_location', 'Can track_location visit'),
  ('53be2d1e-3a6f-414d-9f00-5178637310e8', 'visit.manage_followups', 'Can manage_followups visit'),
  ('5dad9375-3901-40d0-95c3-faa1e3510c6d', 'data.view', 'Can view data'),
  ('510a16cc-336d-4b3e-a64c-14273757cbd9', 'data.create', 'Can create data'),
  ('b82ecb16-a905-48ff-b789-a7baf2a9ea04', 'data.edit', 'Can edit data'),
  ('cb790420-3dcc-442c-87df-67f120eb534d', 'data.delete', 'Can delete data'),
  ('bf8723fe-911a-416f-b944-e489bb0fc015', 'data.approve_changes', 'Can approve_changes data'),
  ('9893445f-3e23-41ae-acbe-a116b17d8a2d', 'data.manage_documents', 'Can manage_documents data'),
  ('bd49bed7-6fe9-4f43-99ea-dc71d19dca55', 'quotation.view', 'Can view quotation'),
  ('a1df6f22-505d-4e4d-88b7-9cca71e2c05a', 'quotation.create', 'Can create quotation'),
  ('be119ae0-33ec-4869-a437-0aa230ca6225', 'quotation.edit', 'Can edit quotation'),
  ('65b9bc9a-f490-42b4-897a-4a836f32f45d', 'quotation.delete', 'Can delete quotation'),
  ('aea9c2b9-b0e8-471f-a6e0-007984684556', 'quotation.generate_pdf', 'Can generate_pdf quotation'),
  ('86978faa-f98f-455d-a8ff-46db83c86838', 'quotation.share', 'Can share quotation'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', 'dashboard.view_agent', 'Can view_agent dashboard'),
  ('0fac90c1-5917-44d6-9732-faec12f07c31', 'dashboard.view_manager', 'Can view_manager dashboard'),
  ('3c68d8d9-b228-4375-b01f-96d2f069ab64', 'dashboard.view_admin', 'Can view_admin dashboard'),
  ('1998a3d9-6369-40ff-aa8b-f23701a0e6e5', 'dashboard.export', 'Can export dashboard'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', 'notification.view', 'Can view notification'),
  ('9a7b1e8a-148d-4f7e-89da-17ea844ad63d', 'notification.send', 'Can send notification'),
  ('823fa8a7-79d9-4f2d-9439-65947b4ee7b0', 'notification.manage', 'Can manage notification'),
  ('f6d9b307-95fc-46e7-ab79-d03733e250b4', 'notification.configure', 'Can configure notification'),
  ('0039a7f5-411b-4fd5-917b-39f44fc86232', 'template.view', 'Can view template'),
  ('ac226a81-05c4-4a9b-8635-9b7b2a23eef2', 'template.create', 'Can create template'),
  ('25c9a175-c159-4f7f-b7c8-e57f667aacdf', 'template.edit', 'Can edit template'),
  ('c9b5bb64-70c4-4b63-bfeb-ff23e9dc1a60', 'template.delete', 'Can delete template'),
  ('aa36421e-4b5e-49d7-aa2b-0a393e7c4e32', 'system.settings_manage', 'Can settings_manage system'),
  ('388104d0-124d-4a9b-b136-fa177f2f9011', 'system.audit_logs_view', 'Can audit_logs_view system'),
  ('201b9a0b-3316-4389-b94d-f5f16885ef2d', 'users.view', 'Can view users'),
  ('7a35c5e0-020b-4654-a193-9a3e5b1dba12', 'users.create', 'Can create users'),
  ('e36b30e8-8b0d-42f9-b1a4-1a90105563d5', 'users.edit', 'Can edit users'),
  ('88254a9f-812b-4eae-9cf0-281e1e2c4722', 'users.delete', 'Can delete users'),
  ('4b1e4393-c687-45c7-ae6f-936d76814144', 'quotations.approve', 'Can approve quotations'),
  ('a8d5a7a1-5c6f-48e4-94c2-9fa3fa359d01', 'settings.manage', 'Can manage settings'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', 'policy.view', 'Can view policy'),
  ('6ce9cdb3-9387-472c-909f-4eee42d1f1c5', 'policy.create', 'Can create policy'),
  ('0d7471b2-8899-41bd-ab53-db852d57330d', 'policy.edit', 'Can edit policy'),
  ('773985fc-0ced-49b0-a14a-7d1331b67b1a', 'policy.delete', 'Can delete policy'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', 'policies.view', 'View policies (plural)')
ON CONFLICT DO NOTHING;

-- Table "public"."_RolePermissions": 421 rows
INSERT INTO "public"."_RolePermissions" ("A", "B")
VALUES
  ('51305b89-5e7a-480d-9813-596f72666e9f', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('2852394e-a829-40cc-9043-91bd1550de99', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('fbfc98c2-899d-4cb8-b45c-b031aa242789', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('ab5040a6-eaa7-4ff1-867f-7cae495401aa', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('e5d81f45-60f6-453d-bec5-0aa02e2f3ee5', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('70c5e75e-8fe3-4e47-ae81-2cd2667c8d19', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0aeac8f2-9e22-4f8d-bff1-9107ce08e539', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('7bf2504c-9e2b-464f-a0c4-260d15f53528', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('4d197e92-9d4b-4426-87d9-57b5303b0c28', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('877289ef-759d-427e-a6bb-b1563c14ee8c', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('117d0eb6-8c5e-4145-ac53-ae74fd8a5295', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('aee31966-a865-41f9-9f0d-ef4d3a28a9bb', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('7f0ef813-f33f-49a5-b10b-c251a16ade4d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('5b38be20-6eaf-428f-af53-b950d3e6efa3', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('221f8c39-7478-43b1-a886-9b45b62e5cc0', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('fb85f2f9-bdb1-440c-8efe-36510d25594d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('b1c2ea73-c98a-404a-997a-e9ee2d0202b9', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('50f78a06-bbc3-42b0-ba5c-a09ce8d1d6ce', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('374ae43c-8013-4f20-a004-483a99854229', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('9091087b-3271-4087-a435-239c830ad2e4', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('57aff330-6fbd-4a4a-a04b-5e653f0c5034', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('91b8ac6e-e85e-440d-8f60-d07c894effa5', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('9cc2e9ed-1d9f-4e9a-9beb-bc20ffa4a572', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('40daa1fc-b870-428a-9c7c-90321747c429', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('ed551e0d-f606-474e-b493-f64b1d92d652', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6f2576c1-1e8b-4e3e-b6f3-46c9fa84463b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('80baa2ea-7634-4b67-bb5b-05275e759910', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6e4ef49f-b9a5-4721-b57f-195500a7695c', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('2c306036-3194-493e-a22d-80d3feec067e', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('c4eb2935-ef65-40ef-9f91-bacdeb39a87a', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('c6e82a7e-b144-41cc-b602-07366695fc66', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('84cf5b82-6018-437d-967e-347a5d14cd52', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('2c927d1b-4848-48b3-8a9a-f664e3067af0', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('3b207a9e-7514-4686-9991-851013feca06', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('a1123f3e-a780-4a68-a0dc-29d0a7d7fdce', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('265deadc-100c-4df7-86da-919a42dc71c3', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0fbbdc50-ba46-4bbe-8eb9-977f4bf0807c', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('827659fb-784b-4fa0-affa-e2fea1e79df5', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('11f84a8a-4e60-4bce-bb2f-7efbd45f12eb', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('65a72590-282f-462a-a9c8-ba5bf3c1055a', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('55792f22-0f9f-45b2-b081-bc59d5ad564b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('f58c672b-a2a4-4835-9b68-0521206b923d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('1e2db7cc-b28c-415a-b9bd-9a9e7cab6ff4', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('7a122720-dc68-4e8c-8b67-ac13f12a8cb3', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0f7cabf9-3a75-4fe7-bb34-fa32bf6e5076', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('581bc13c-8332-4849-852c-4220b1b5778d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('c8f67558-4919-4a83-887e-0fb4414b537e', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('863b1977-a38f-4cb4-aa67-50deae370a5e', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('428d035b-5bf2-4862-ac12-1a51bfd737b8', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('4a2404b3-c571-422c-bc5e-ed34d9c1f3f6', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('89b4c6bf-406a-4086-9b09-baf4b076649b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('3cc8a38c-63c5-4c30-aa62-9789dde7855c', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('305d0e8e-f81a-4dbb-9329-17297fd31c40', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('abf3ee95-bff5-495d-a8f2-9850b3c36630', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('2f134a6e-1a75-4804-b298-ccd51c754c60', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('40ef733a-97ac-4f3f-a56c-42f20ed42b1a', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('dd56af8c-7b2a-41f2-901f-e54bbe7a3969', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6595c861-cc0e-486b-8329-6b370c67b3b4', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('977cbd60-3093-4edc-ada4-9c8db557e739', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('d3cfe41c-2e8e-495b-917e-59423eca168b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6793a2ce-6765-4589-b2eb-28e0375847df', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('1b7d1243-453b-4f5a-b106-18018afaaf29', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('7b7e2fd2-01c0-4681-a13c-272646f10e2b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('4b842bec-b260-4bc7-8a05-554c0b9b6171', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('f9132a85-65d9-4841-ab56-38897ca7223c', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('8ee5496d-6d3a-4c54-a912-f66b462ec600', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('422bd90c-35e9-4f1e-9bb5-269b81ed0c79', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('ec427542-cd99-43fe-8b23-128b0e0219b8', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('3bbb38b0-7d6e-4251-8061-1f039171e2ff', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('4ccef598-0ffb-4fa3-8da8-58ab656d150c', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('46e7c143-23ec-417d-900d-1edf87f102f6', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('ec01f3e2-9d29-4a3c-943f-a21e51d69e0b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6045686f-db0a-4982-88e3-fdcad6893751', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('ee21134a-1e4b-44cb-b524-34e5f66da070', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('861d3c6a-6184-4357-b806-f837f5804781', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0bc2b80c-a26a-462d-82b5-872a935c989b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('e87d7187-053f-4586-9efd-482e2f947e69', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('53be2d1e-3a6f-414d-9f00-5178637310e8', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('5dad9375-3901-40d0-95c3-faa1e3510c6d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('510a16cc-336d-4b3e-a64c-14273757cbd9', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('b82ecb16-a905-48ff-b789-a7baf2a9ea04', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('cb790420-3dcc-442c-87df-67f120eb534d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('bf8723fe-911a-416f-b944-e489bb0fc015', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('9893445f-3e23-41ae-acbe-a116b17d8a2d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('bd49bed7-6fe9-4f43-99ea-dc71d19dca55', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('a1df6f22-505d-4e4d-88b7-9cca71e2c05a', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('be119ae0-33ec-4869-a437-0aa230ca6225', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('65b9bc9a-f490-42b4-897a-4a836f32f45d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('aea9c2b9-b0e8-471f-a6e0-007984684556', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('86978faa-f98f-455d-a8ff-46db83c86838', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0fac90c1-5917-44d6-9732-faec12f07c31', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('3c68d8d9-b228-4375-b01f-96d2f069ab64', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('1998a3d9-6369-40ff-aa8b-f23701a0e6e5', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('9a7b1e8a-148d-4f7e-89da-17ea844ad63d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('823fa8a7-79d9-4f2d-9439-65947b4ee7b0', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('f6d9b307-95fc-46e7-ab79-d03733e250b4', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0039a7f5-411b-4fd5-917b-39f44fc86232', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('ac226a81-05c4-4a9b-8635-9b7b2a23eef2', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('25c9a175-c159-4f7f-b7c8-e57f667aacdf', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('c9b5bb64-70c4-4b63-bfeb-ff23e9dc1a60', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('aa36421e-4b5e-49d7-aa2b-0a393e7c4e32', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('388104d0-124d-4a9b-b136-fa177f2f9011', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('201b9a0b-3316-4389-b94d-f5f16885ef2d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('7a35c5e0-020b-4654-a193-9a3e5b1dba12', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('e36b30e8-8b0d-42f9-b1a4-1a90105563d5', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('88254a9f-812b-4eae-9cf0-281e1e2c4722', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('4b1e4393-c687-45c7-ae6f-936d76814144', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('a8d5a7a1-5c6f-48e4-94c2-9fa3fa359d01', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('6ce9cdb3-9387-472c-909f-4eee42d1f1c5', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('0d7471b2-8899-41bd-ab53-db852d57330d', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('773985fc-0ced-49b0-a14a-7d1331b67b1a', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('51305b89-5e7a-480d-9813-596f72666e9f', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('2852394e-a829-40cc-9043-91bd1550de99', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('fbfc98c2-899d-4cb8-b45c-b031aa242789', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('ab5040a6-eaa7-4ff1-867f-7cae495401aa', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('e5d81f45-60f6-453d-bec5-0aa02e2f3ee5', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('70c5e75e-8fe3-4e47-ae81-2cd2667c8d19', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0aeac8f2-9e22-4f8d-bff1-9107ce08e539', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('7bf2504c-9e2b-464f-a0c4-260d15f53528', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('4d197e92-9d4b-4426-87d9-57b5303b0c28', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('877289ef-759d-427e-a6bb-b1563c14ee8c', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('117d0eb6-8c5e-4145-ac53-ae74fd8a5295', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('aee31966-a865-41f9-9f0d-ef4d3a28a9bb', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('7f0ef813-f33f-49a5-b10b-c251a16ade4d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('5b38be20-6eaf-428f-af53-b950d3e6efa3', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('221f8c39-7478-43b1-a886-9b45b62e5cc0', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('fb85f2f9-bdb1-440c-8efe-36510d25594d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('b1c2ea73-c98a-404a-997a-e9ee2d0202b9', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('50f78a06-bbc3-42b0-ba5c-a09ce8d1d6ce', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('374ae43c-8013-4f20-a004-483a99854229', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('9091087b-3271-4087-a435-239c830ad2e4', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('57aff330-6fbd-4a4a-a04b-5e653f0c5034', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('91b8ac6e-e85e-440d-8f60-d07c894effa5', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('9cc2e9ed-1d9f-4e9a-9beb-bc20ffa4a572', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('40daa1fc-b870-428a-9c7c-90321747c429', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('ed551e0d-f606-474e-b493-f64b1d92d652', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6f2576c1-1e8b-4e3e-b6f3-46c9fa84463b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('80baa2ea-7634-4b67-bb5b-05275e759910', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6e4ef49f-b9a5-4721-b57f-195500a7695c', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('2c306036-3194-493e-a22d-80d3feec067e', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('c4eb2935-ef65-40ef-9f91-bacdeb39a87a', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('c6e82a7e-b144-41cc-b602-07366695fc66', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('84cf5b82-6018-437d-967e-347a5d14cd52', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('2c927d1b-4848-48b3-8a9a-f664e3067af0', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('3b207a9e-7514-4686-9991-851013feca06', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('a1123f3e-a780-4a68-a0dc-29d0a7d7fdce', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('265deadc-100c-4df7-86da-919a42dc71c3', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0fbbdc50-ba46-4bbe-8eb9-977f4bf0807c', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('827659fb-784b-4fa0-affa-e2fea1e79df5', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('11f84a8a-4e60-4bce-bb2f-7efbd45f12eb', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('65a72590-282f-462a-a9c8-ba5bf3c1055a', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('55792f22-0f9f-45b2-b081-bc59d5ad564b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('f58c672b-a2a4-4835-9b68-0521206b923d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('1e2db7cc-b28c-415a-b9bd-9a9e7cab6ff4', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('7a122720-dc68-4e8c-8b67-ac13f12a8cb3', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0f7cabf9-3a75-4fe7-bb34-fa32bf6e5076', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('581bc13c-8332-4849-852c-4220b1b5778d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('c8f67558-4919-4a83-887e-0fb4414b537e', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('863b1977-a38f-4cb4-aa67-50deae370a5e', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('428d035b-5bf2-4862-ac12-1a51bfd737b8', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('4a2404b3-c571-422c-bc5e-ed34d9c1f3f6', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('89b4c6bf-406a-4086-9b09-baf4b076649b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('3cc8a38c-63c5-4c30-aa62-9789dde7855c', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('305d0e8e-f81a-4dbb-9329-17297fd31c40', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('abf3ee95-bff5-495d-a8f2-9850b3c36630', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('2f134a6e-1a75-4804-b298-ccd51c754c60', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('40ef733a-97ac-4f3f-a56c-42f20ed42b1a', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('dd56af8c-7b2a-41f2-901f-e54bbe7a3969', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6595c861-cc0e-486b-8329-6b370c67b3b4', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('977cbd60-3093-4edc-ada4-9c8db557e739', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('d3cfe41c-2e8e-495b-917e-59423eca168b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6793a2ce-6765-4589-b2eb-28e0375847df', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('1b7d1243-453b-4f5a-b106-18018afaaf29', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('7b7e2fd2-01c0-4681-a13c-272646f10e2b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('4b842bec-b260-4bc7-8a05-554c0b9b6171', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('f9132a85-65d9-4841-ab56-38897ca7223c', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('8ee5496d-6d3a-4c54-a912-f66b462ec600', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('422bd90c-35e9-4f1e-9bb5-269b81ed0c79', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('ec427542-cd99-43fe-8b23-128b0e0219b8', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('3bbb38b0-7d6e-4251-8061-1f039171e2ff', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('4ccef598-0ffb-4fa3-8da8-58ab656d150c', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('46e7c143-23ec-417d-900d-1edf87f102f6', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('ec01f3e2-9d29-4a3c-943f-a21e51d69e0b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6045686f-db0a-4982-88e3-fdcad6893751', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('ee21134a-1e4b-44cb-b524-34e5f66da070', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('861d3c6a-6184-4357-b806-f837f5804781', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0bc2b80c-a26a-462d-82b5-872a935c989b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('e87d7187-053f-4586-9efd-482e2f947e69', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('53be2d1e-3a6f-414d-9f00-5178637310e8', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('5dad9375-3901-40d0-95c3-faa1e3510c6d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('510a16cc-336d-4b3e-a64c-14273757cbd9', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('b82ecb16-a905-48ff-b789-a7baf2a9ea04', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('cb790420-3dcc-442c-87df-67f120eb534d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('bf8723fe-911a-416f-b944-e489bb0fc015', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('9893445f-3e23-41ae-acbe-a116b17d8a2d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('bd49bed7-6fe9-4f43-99ea-dc71d19dca55', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('a1df6f22-505d-4e4d-88b7-9cca71e2c05a', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('be119ae0-33ec-4869-a437-0aa230ca6225', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('65b9bc9a-f490-42b4-897a-4a836f32f45d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('aea9c2b9-b0e8-471f-a6e0-007984684556', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('86978faa-f98f-455d-a8ff-46db83c86838', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0fac90c1-5917-44d6-9732-faec12f07c31', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('3c68d8d9-b228-4375-b01f-96d2f069ab64', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('1998a3d9-6369-40ff-aa8b-f23701a0e6e5', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('9a7b1e8a-148d-4f7e-89da-17ea844ad63d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('823fa8a7-79d9-4f2d-9439-65947b4ee7b0', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('f6d9b307-95fc-46e7-ab79-d03733e250b4', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0039a7f5-411b-4fd5-917b-39f44fc86232', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('ac226a81-05c4-4a9b-8635-9b7b2a23eef2', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('25c9a175-c159-4f7f-b7c8-e57f667aacdf', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('c9b5bb64-70c4-4b63-bfeb-ff23e9dc1a60', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('201b9a0b-3316-4389-b94d-f5f16885ef2d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('7a35c5e0-020b-4654-a193-9a3e5b1dba12', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('e36b30e8-8b0d-42f9-b1a4-1a90105563d5', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('88254a9f-812b-4eae-9cf0-281e1e2c4722', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('4b1e4393-c687-45c7-ae6f-936d76814144', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('a8d5a7a1-5c6f-48e4-94c2-9fa3fa359d01', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('6ce9cdb3-9387-472c-909f-4eee42d1f1c5', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('0d7471b2-8899-41bd-ab53-db852d57330d', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('773985fc-0ced-49b0-a14a-7d1331b67b1a', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('7f0ef813-f33f-49a5-b10b-c251a16ade4d', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('5b38be20-6eaf-428f-af53-b950d3e6efa3', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('fb85f2f9-bdb1-440c-8efe-36510d25594d', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('374ae43c-8013-4f20-a004-483a99854229', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('4ccef598-0ffb-4fa3-8da8-58ab656d150c', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('46e7c143-23ec-417d-900d-1edf87f102f6', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('6045686f-db0a-4982-88e3-fdcad6893751', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('53be2d1e-3a6f-414d-9f00-5178637310e8', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('5dad9375-3901-40d0-95c3-faa1e3510c6d', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('bd49bed7-6fe9-4f43-99ea-dc71d19dca55', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('a1df6f22-505d-4e4d-88b7-9cca71e2c05a', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('be119ae0-33ec-4869-a437-0aa230ca6225', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('aea9c2b9-b0e8-471f-a6e0-007984684556', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('86978faa-f98f-455d-a8ff-46db83c86838', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('7f0ef813-f33f-49a5-b10b-c251a16ade4d', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('5b38be20-6eaf-428f-af53-b950d3e6efa3', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('e87d7187-053f-4586-9efd-482e2f947e69', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('53be2d1e-3a6f-414d-9f00-5178637310e8', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('6f2576c1-1e8b-4e3e-b6f3-46c9fa84463b', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('80baa2ea-7634-4b67-bb5b-05275e759910', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('6e4ef49f-b9a5-4721-b57f-195500a7695c', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('c4eb2935-ef65-40ef-9f91-bacdeb39a87a', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('c6e82a7e-b144-41cc-b602-07366695fc66', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('84cf5b82-6018-437d-967e-347a5d14cd52', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('2c927d1b-4848-48b3-8a9a-f664e3067af0', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('3b207a9e-7514-4686-9991-851013feca06', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('265deadc-100c-4df7-86da-919a42dc71c3', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('0fbbdc50-ba46-4bbe-8eb9-977f4bf0807c', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('7a122720-dc68-4e8c-8b67-ac13f12a8cb3', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('0f7cabf9-3a75-4fe7-bb34-fa32bf6e5076', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('581bc13c-8332-4849-852c-4220b1b5778d', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('863b1977-a38f-4cb4-aa67-50deae370a5e', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('428d035b-5bf2-4862-ac12-1a51bfd737b8', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('9893445f-3e23-41ae-acbe-a116b17d8a2d', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('4b842bec-b260-4bc7-8a05-554c0b9b6171', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('f9132a85-65d9-4841-ab56-38897ca7223c', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('8ee5496d-6d3a-4c54-a912-f66b462ec600', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('ec427542-cd99-43fe-8b23-128b0e0219b8', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('3bbb38b0-7d6e-4251-8061-1f039171e2ff', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('4ccef598-0ffb-4fa3-8da8-58ab656d150c', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('46e7c143-23ec-417d-900d-1edf87f102f6', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('6045686f-db0a-4982-88e3-fdcad6893751', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('ee21134a-1e4b-44cb-b524-34e5f66da070', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('4a2404b3-c571-422c-bc5e-ed34d9c1f3f6', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('89b4c6bf-406a-4086-9b09-baf4b076649b', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('3cc8a38c-63c5-4c30-aa62-9789dde7855c', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('abf3ee95-bff5-495d-a8f2-9850b3c36630', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('2f134a6e-1a75-4804-b298-ccd51c754c60', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('6f2576c1-1e8b-4e3e-b6f3-46c9fa84463b', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('84cf5b82-6018-437d-967e-347a5d14cd52', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('827659fb-784b-4fa0-affa-e2fea1e79df5', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('7a122720-dc68-4e8c-8b67-ac13f12a8cb3', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('4b842bec-b260-4bc7-8a05-554c0b9b6171', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('bd49bed7-6fe9-4f43-99ea-dc71d19dca55', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '79721d05-5251-44e5-8fea-de18a4f1e206'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', 'e351bdb6-3971-4737-9085-5c4bb9a65b0a'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '27fd79aa-c2f1-4369-91b1-40e5bd086553'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', 'e00e4d57-e299-44de-9884-7bc26d41be46'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '93f25e27-b6fa-4965-b5be-fc2a18ede279'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '8323a39d-0dfb-4f2d-88ca-fb948cedd0b1'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', 'faa2d2ca-0c8c-4598-941c-0200f56eff73'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '5d383603-29ba-46c0-981e-5ce2427ecb01'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '31fcb39f-5ff7-45fc-915d-0b6839160386'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', 'e479ef4d-e282-4941-9f5a-64b259c38259'),
  ('168886f3-c2eb-4b5b-bc9c-d71766e882e6', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('7f0ef813-f33f-49a5-b10b-c251a16ade4d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('5b38be20-6eaf-428f-af53-b950d3e6efa3', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('fb85f2f9-bdb1-440c-8efe-36510d25594d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('b1c2ea73-c98a-404a-997a-e9ee2d0202b9', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('50f78a06-bbc3-42b0-ba5c-a09ce8d1d6ce', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('374ae43c-8013-4f20-a004-483a99854229', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('6f2576c1-1e8b-4e3e-b6f3-46c9fa84463b', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('80baa2ea-7634-4b67-bb5b-05275e759910', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('6e4ef49f-b9a5-4721-b57f-195500a7695c', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('c4eb2935-ef65-40ef-9f91-bacdeb39a87a', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('c6e82a7e-b144-41cc-b602-07366695fc66', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('84cf5b82-6018-437d-967e-347a5d14cd52', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('2c927d1b-4848-48b3-8a9a-f664e3067af0', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('3b207a9e-7514-4686-9991-851013feca06', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('265deadc-100c-4df7-86da-919a42dc71c3', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('0fbbdc50-ba46-4bbe-8eb9-977f4bf0807c', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('827659fb-784b-4fa0-affa-e2fea1e79df5', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('11f84a8a-4e60-4bce-bb2f-7efbd45f12eb', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('65a72590-282f-462a-a9c8-ba5bf3c1055a', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('f58c672b-a2a4-4835-9b68-0521206b923d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('7a122720-dc68-4e8c-8b67-ac13f12a8cb3', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('0f7cabf9-3a75-4fe7-bb34-fa32bf6e5076', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('581bc13c-8332-4849-852c-4220b1b5778d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('863b1977-a38f-4cb4-aa67-50deae370a5e', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('4a2404b3-c571-422c-bc5e-ed34d9c1f3f6', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('abf3ee95-bff5-495d-a8f2-9850b3c36630', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('2f134a6e-1a75-4804-b298-ccd51c754c60', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('dd56af8c-7b2a-41f2-901f-e54bbe7a3969', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('6595c861-cc0e-486b-8329-6b370c67b3b4', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('977cbd60-3093-4edc-ada4-9c8db557e739', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('d3cfe41c-2e8e-495b-917e-59423eca168b', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('6793a2ce-6765-4589-b2eb-28e0375847df', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('1b7d1243-453b-4f5a-b106-18018afaaf29', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('7b7e2fd2-01c0-4681-a13c-272646f10e2b', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('4b842bec-b260-4bc7-8a05-554c0b9b6171', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('f9132a85-65d9-4841-ab56-38897ca7223c', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('8ee5496d-6d3a-4c54-a912-f66b462ec600', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('ec427542-cd99-43fe-8b23-128b0e0219b8', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('3bbb38b0-7d6e-4251-8061-1f039171e2ff', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('33d42f43-e0df-41c9-954a-17fdab585f6a', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('4ccef598-0ffb-4fa3-8da8-58ab656d150c', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('46e7c143-23ec-417d-900d-1edf87f102f6', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('6045686f-db0a-4982-88e3-fdcad6893751', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('ee21134a-1e4b-44cb-b524-34e5f66da070', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('7a8c2287-f798-42d3-b6e0-15cf4b7cc9b3', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('32e0c421-7e48-4aea-8425-a57c7710f671', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('861d3c6a-6184-4357-b806-f837f5804781', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('53be2d1e-3a6f-414d-9f00-5178637310e8', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('5dad9375-3901-40d0-95c3-faa1e3510c6d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('510a16cc-336d-4b3e-a64c-14273757cbd9', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('9893445f-3e23-41ae-acbe-a116b17d8a2d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('bd49bed7-6fe9-4f43-99ea-dc71d19dca55', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('a1df6f22-505d-4e4d-88b7-9cca71e2c05a', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('be119ae0-33ec-4869-a437-0aa230ca6225', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('aea9c2b9-b0e8-471f-a6e0-007984684556', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('86978faa-f98f-455d-a8ff-46db83c86838', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('8a67f3f8-206a-42b5-91d8-847913e3188b', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('0fac90c1-5917-44d6-9732-faec12f07c31', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('1998a3d9-6369-40ff-aa8b-f23701a0e6e5', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('9a7b1e8a-148d-4f7e-89da-17ea844ad63d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('0039a7f5-411b-4fd5-917b-39f44fc86232', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('201b9a0b-3316-4389-b94d-f5f16885ef2d', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('7a35c5e0-020b-4654-a193-9a3e5b1dba12', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('e36b30e8-8b0d-42f9-b1a4-1a90105563d5', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('88254a9f-812b-4eae-9cf0-281e1e2c4722', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '91d011bf-75b1-417f-8f6f-e7eaef1d0804'),
  ('40ef733a-97ac-4f3f-a56c-42f20ed42b1a', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('dd56af8c-7b2a-41f2-901f-e54bbe7a3969', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('6595c861-cc0e-486b-8329-6b370c67b3b4', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('977cbd60-3093-4edc-ada4-9c8db557e739', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('d3cfe41c-2e8e-495b-917e-59423eca168b', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('6793a2ce-6765-4589-b2eb-28e0375847df', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('1b7d1243-453b-4f5a-b106-18018afaaf29', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('7b7e2fd2-01c0-4681-a13c-272646f10e2b', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('3c68d8d9-b228-4375-b01f-96d2f069ab64', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('6d1666bf-3692-41cd-aa67-6860d462a959', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('201b9a0b-3316-4389-b94d-f5f16885ef2d', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('7a35c5e0-020b-4654-a193-9a3e5b1dba12', '530453e1-a746-47a9-a69c-bd8015e1626f'),
  ('e36b30e8-8b0d-42f9-b1a4-1a90105563d5', '530453e1-a746-47a9-a69c-bd8015e1626f')
ON CONFLICT DO NOTHING;

-- Table "public"."users": 14 rows
INSERT INTO "public"."users" ("id", "email", "fullName", "roleId", "isActive", "expoPushToken", "highestQualification", "dateOfBirth", "joiningDate", "personalMobile", "homeMobile", "onboardingRemark", "onboardingUpdated", "createdAt", "updatedAt", "managerId", "deletedAt")
VALUES
  ('5c25b152-c8aa-442d-83a6-a39d0b2f80ad', 'blochmustafa052@gmail.com', 'MUSTAFA BLOCH', '27fd79aa-c2f1-4369-91b1-40e5bd086553', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-09-12T05:40:57.183Z'::timestamptz, '2026-09-12T06:28:02.811Z'::timestamptz, '2b56ea7e-5cb0-4059-878d-6cc2b628c543', NULL),
  ('04f990e7-9d7f-4eec-ba66-843c90f3a599', 'torquecrm28@gmail.com', 'Payal', '27fd79aa-c2f1-4369-91b1-40e5bd086553', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-09-12T07:20:59.496Z'::timestamptz, '2026-09-12T07:20:59.496Z'::timestamptz, '2b56ea7e-5cb0-4059-878d-6cc2b628c543', NULL),
  ('8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'torqueautoadvisor@gmail.com', 'Admin', '79721d05-5251-44e5-8fea-de18a4f1e206', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-05T11:50:00.444Z'::timestamptz, '2026-08-17T18:22:24.971Z'::timestamptz, NULL, NULL),
  ('2b56ea7e-5cb0-4059-878d-6cc2b628c543', 'manager1@torque.in', 'Manager 1', '91d011bf-75b1-417f-8f6f-e7eaef1d0804', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:27.942Z'::timestamptz, '2026-08-17T18:22:25.529Z'::timestamptz, NULL, NULL),
  ('37a211dd-6829-4b97-99e7-7fee3f5d9818', 'manager2@torque.in', 'Manager 2', '91d011bf-75b1-417f-8f6f-e7eaef1d0804', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:28.274Z'::timestamptz, '2026-08-17T18:22:25.879Z'::timestamptz, NULL, NULL),
  ('c9141a42-f10f-414f-9fc7-aa736e921454', 'test@gmail.com', 'jiya ', '27fd79aa-c2f1-4369-91b1-40e5bd086553', FALSE, NULL, 'BscCS', '2015-01-02T00:00:00.000Z'::timestamptz, '2026-09-17T00:00:00.000Z'::timestamptz, '9825358617', '9825358617', NULL, FALSE, '2026-09-12T07:43:57.489Z'::timestamptz, '2026-09-12T07:45:45.492Z'::timestamptz, 'cdae57e6-a5b1-4be7-9264-127d51acecdf', NULL),
  ('0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'krishnatorque055@gmail.com', 'Krishna', '27fd79aa-c2f1-4369-91b1-40e5bd086553', TRUE, NULL, 'Bcom', '2002-02-24T00:00:00.000Z'::timestamptz, '2026-06-01T00:00:00.000Z'::timestamptz, '+918200075062', '+919925285481', NULL, FALSE, '2026-09-12T07:28:50.796Z'::timestamptz, '2026-09-12T07:49:06.841Z'::timestamptz, '2b56ea7e-5cb0-4059-878d-6cc2b628c543', NULL),
  ('cdae57e6-a5b1-4be7-9264-127d51acecdf', 'hr1@torque.in', 'HR 1', '530453e1-a746-47a9-a69c-bd8015e1626f', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:29.983Z'::timestamptz, '2026-08-17T18:22:27.497Z'::timestamptz, NULL, NULL),
  ('38e38ca2-51a3-4f37-a541-ddad677353d9', 'accountant1@torque.in', 'Accountant 1', '31fcb39f-5ff7-45fc-915d-0b6839160386', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:30.301Z'::timestamptz, '2026-08-17T18:22:27.836Z'::timestamptz, NULL, NULL),
  ('a11f0c8c-aa4d-46ca-addc-4b861176c272', 'angelinsurance18@gmail.com', 'Divyaba', '530453e1-a746-47a9-a69c-bd8015e1626f', FALSE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-09-12T10:33:52.828Z'::timestamptz, '2026-09-12T10:33:52.828Z'::timestamptz, NULL, NULL),
  ('8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', 'sales1@torque.in', 'Sales 1', '27fd79aa-c2f1-4369-91b1-40e5bd086553', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:28.651Z'::timestamptz, '2026-08-17T18:22:27.958Z'::timestamptz, '2b56ea7e-5cb0-4059-878d-6cc2b628c543', NULL),
  ('5e6a8c0e-a60c-4741-b280-f7cac79e029c', 'sales2@torque.in', 'Sales 2', '27fd79aa-c2f1-4369-91b1-40e5bd086553', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:29.063Z'::timestamptz, '2026-08-17T18:22:28.071Z'::timestamptz, '2b56ea7e-5cb0-4059-878d-6cc2b628c543', NULL),
  ('3c1e8734-ac95-4790-90c5-74d9479b1322', 'sales3@torque.in', 'Sales 3', '27fd79aa-c2f1-4369-91b1-40e5bd086553', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:29.316Z'::timestamptz, '2026-08-17T18:22:28.179Z'::timestamptz, '37a211dd-6829-4b97-99e7-7fee3f5d9818', NULL),
  ('57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', 'sales4@torque.in', 'Sales 4', '27fd79aa-c2f1-4369-91b1-40e5bd086553', TRUE, NULL, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, '2026-08-17T18:21:29.638Z'::timestamptz, '2026-08-17T18:22:28.281Z'::timestamptz, '37a211dd-6829-4b97-99e7-7fee3f5d9818', NULL)
ON CONFLICT DO NOTHING;

-- Table "public"."_UserPermissions": 18 rows
INSERT INTO "public"."_UserPermissions" ("A", "B")
VALUES
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '2b56ea7e-5cb0-4059-878d-6cc2b628c543'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '2b56ea7e-5cb0-4059-878d-6cc2b628c543'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '37a211dd-6829-4b97-99e7-7fee3f5d9818'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '37a211dd-6829-4b97-99e7-7fee3f5d9818'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', 'cdae57e6-a5b1-4be7-9264-127d51acecdf'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', 'cdae57e6-a5b1-4be7-9264-127d51acecdf'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '38e38ca2-51a3-4f37-a541-ddad677353d9'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '38e38ca2-51a3-4f37-a541-ddad677353d9'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '5e6a8c0e-a60c-4741-b280-f7cac79e029c'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '5e6a8c0e-a60c-4741-b280-f7cac79e029c'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '3c1e8734-ac95-4790-90c5-74d9479b1322'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '3c1e8734-ac95-4790-90c5-74d9479b1322'),
  ('739d3a28-44ad-4858-8d3b-895a749f4634', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b'),
  ('b1bd0a3c-c617-45d3-be6f-3101e14df788', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b')
ON CONFLICT DO NOTHING;

-- Table "public"."category_details": 46 rows
INSERT INTO "public"."category_details" ("id", "name", "status", "createdAt", "updatedAt")
VALUES
  ('bb6fc49e-42c1-46a4-ad70-032f9ca01510', 'CHOLA 2501-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:35.470Z'::timestamptz, '2026-07-24T09:30:35.470Z'::timestamptz),
  ('23aed9b2-81db-4248-9cc5-a94d29440b42', 'SHRIRAM 0-2800 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:35.925Z'::timestamptz, '2026-07-24T09:30:35.925Z'::timestamptz),
  ('105e4285-66bb-494d-832d-fc44f5ba956d', 'TATA 2501-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:36.341Z'::timestamptz, '2026-07-24T09:30:36.341Z'::timestamptz),
  ('ed339ff6-83c4-4fb1-91d9-8fcb7c547249', 'SBI 0-2000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:36.764Z'::timestamptz, '2026-07-24T09:30:36.764Z'::timestamptz),
  ('4340d12c-0a3e-45e9-9211-4f52ed52f63f', 'SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR', 1, '2026-07-24T09:30:37.216Z'::timestamptz, '2026-07-24T09:30:37.216Z'::timestamptz),
  ('e7246c1e-c7eb-4d60-a93f-e737f63d59cf', 'MAGMA 12000-40000 GVW NORMAL ABOVE 5 YEAR', 1, '2026-07-24T09:30:37.907Z'::timestamptz, '2026-07-24T09:30:37.907Z'::timestamptz),
  ('75f6f90e-3eef-4524-b131-941e025e42b0', 'MAGMA 20000-40000 GVW NIL DEP', 1, '2026-07-24T09:30:38.381Z'::timestamptz, '2026-07-24T09:30:38.381Z'::timestamptz),
  ('c3a617e7-bfd9-4644-87ed-bbbabc059714', 'SHRIRAM 7500-42500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:39.125Z'::timestamptz, '2026-07-24T09:30:39.125Z'::timestamptz),
  ('49302053-73b9-4465-ac0e-c56bc940726b', 'TATA 3501-12000 GVW NIL DEP & NORMAL', 1, '2026-07-24T09:30:39.540Z'::timestamptz, '2026-07-24T09:30:39.540Z'::timestamptz),
  ('78718fa8-9e3a-41d6-8b0d-74e046f1d164', 'CHOLA 20000-40000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:40.020Z'::timestamptz, '2026-07-24T09:30:40.020Z'::timestamptz),
  ('17f2e250-1352-4780-9456-10dc5a8bc1fa', 'ICICI 3500 -7500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:40.415Z'::timestamptz, '2026-07-24T09:30:40.415Z'::timestamptz),
  ('9587e1d3-44e9-448d-b28c-44604c632370', 'GO DIGIT 20000-43000 GVW ABOVE 5 YEAR', 1, '2026-07-24T09:30:40.884Z'::timestamptz, '2026-07-24T09:30:40.884Z'::timestamptz),
  ('c787a00c-0168-4282-967f-a091964cbad1', 'TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI', 1, '2026-07-24T09:30:41.355Z'::timestamptz, '2026-07-24T09:30:41.355Z'::timestamptz),
  ('64e4a022-3391-4939-97a7-7831a7e43fa5', 'ICICI 7500-11990 GVW NORMAL', 1, '2026-07-24T09:30:42.200Z'::timestamptz, '2026-07-24T09:30:42.200Z'::timestamptz),
  ('e9d77f2b-79e2-47ea-8977-c6b67b9c8ba4', 'ICICI 7500-11990 GVW NIL DEP', 1, '2026-07-24T09:30:42.650Z'::timestamptz, '2026-07-24T09:30:42.650Z'::timestamptz),
  ('595ec937-4d61-4383-abe8-c8c7114ab17d', 'SCHOOL BUS RELIANCE/TATA/GO DIGIT', 1, '2026-07-24T09:30:43.045Z'::timestamptz, '2026-07-24T09:30:43.045Z'::timestamptz),
  ('23f8ef23-a5e1-486e-904f-fb8e93c15e19', 'MAGMA 20000-40000 GVW NORMAL BELOW 5 YEAR', 1, '2026-07-24T09:30:43.773Z'::timestamptz, '2026-07-24T09:30:43.773Z'::timestamptz),
  ('0c3d6bc7-eea8-4d9f-a54d-537d1fe96f19', 'LIBERTY 0-2500 GVW NORMAL AND NIL DEP', 1, '2026-07-24T09:30:44.180Z'::timestamptz, '2026-07-24T09:30:44.180Z'::timestamptz),
  ('b47b204e-8108-471e-ae1b-dc96c0488a96', 'UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:44.719Z'::timestamptz, '2026-07-24T09:30:44.719Z'::timestamptz),
  ('1e208c98-e5e8-47bc-8e71-fcfd05099abc', 'SHRIRAM ABOVE 50000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:45.201Z'::timestamptz, '2026-07-24T09:30:45.201Z'::timestamptz),
  ('d9754add-8388-4ffc-94d0-36801247e5a1', 'ICICI 0-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:45.673Z'::timestamptz, '2026-07-24T09:30:45.673Z'::timestamptz),
  ('90aaecc4-c496-4d62-8bc9-63ca34ced6d8', 'SBI 2500-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:46.098Z'::timestamptz, '2026-07-24T09:30:46.098Z'::timestamptz),
  ('a998c4a1-ef75-4154-bc3b-87ff1ff96e81', 'RELIANCE 40001-50000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:46.920Z'::timestamptz, '2026-07-24T09:30:46.920Z'::timestamptz),
  ('53307241-9bb7-4cbd-a04a-f38618df1141', 'SHRIRAM 15 YEARS OLD 0-2800 GVW', 1, '2026-07-24T09:30:47.615Z'::timestamptz, '2026-07-24T09:30:47.615Z'::timestamptz),
  ('2f36d93e-f2c5-4945-9243-8668d6ad79b6', 'SHRIRAM 15 YEARS OLD 7500-42500 GVW', 1, '2026-07-24T09:30:48.302Z'::timestamptz, '2026-07-24T09:30:48.302Z'::timestamptz),
  ('afd2891e-29fe-4e6b-af12-daea2e2b6498', 'UNITED & IFFCO MAXI UPTO 20 SEATER', 1, '2026-07-24T09:30:49.170Z'::timestamptz, '2026-07-24T09:30:49.170Z'::timestamptz),
  ('3da97fe8-85a2-435f-803f-7645d10585c7', 'FUTURE 3500-7500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:50.180Z'::timestamptz, '2026-07-24T09:30:50.180Z'::timestamptz),
  ('64245dd1-1f68-4965-a2ce-1fe42ce77214', 'SBI 12000-40000 GVW BELOW 5 YEAR NIL DEP AND NORMAL', 1, '2026-07-24T09:30:50.662Z'::timestamptz, '2026-07-24T09:30:50.662Z'::timestamptz),
  ('1d9999ad-1dcd-47e1-a8c6-a5fcdc55d22c', 'ROYAL 12000-20000 GVW NIL DEP', 1, '2026-07-24T09:30:51.120Z'::timestamptz, '2026-07-24T09:30:51.120Z'::timestamptz),
  ('00e7ca9a-12ae-408e-96c1-48cc97bc709d', 'MAGMA 7500-12000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:51.519Z'::timestamptz, '2026-07-24T09:30:51.519Z'::timestamptz),
  ('abaee7ef-db44-4ff6-95c7-d802cea8a76e', 'GENERALI CENTRAL (FUTURE) 0-3500 GVW NIL DEP & NORMAL', 1, '2026-07-24T09:30:51.995Z'::timestamptz, '2026-07-24T09:30:51.995Z'::timestamptz),
  ('ce73331f-88b2-49b4-9528-5f936bd1fb78', 'SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:52.399Z'::timestamptz, '2026-07-24T09:30:52.399Z'::timestamptz),
  ('ae2d243c-96fe-4649-8f1c-566b1870795d', 'HDFC 0-2500 GVW NORMAL & NIL DEP', 1, '2026-07-24T09:30:52.875Z'::timestamptz, '2026-07-24T09:30:52.875Z'::timestamptz),
  ('283df45d-8ca0-41e2-a9bb-62c10f407162', 'HDFC 2501-3500 GVW NORMAL & NIL DEP', 1, '2026-07-24T09:30:53.333Z'::timestamptz, '2026-07-24T09:30:53.333Z'::timestamptz),
  ('234f231c-78a0-4abc-a062-1209dd877ce1', 'ROYAL 12000-20000 GVW NORMAL', 1, '2026-07-24T09:30:53.780Z'::timestamptz, '2026-07-24T09:30:53.780Z'::timestamptz),
  ('00691ded-12ab-4ffe-91ca-d849a5d0f9d7', 'SBI ABOVE 40000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:54.286Z'::timestamptz, '2026-07-24T09:30:54.286Z'::timestamptz),
  ('1b40b5c1-d15a-4be2-af5a-592ce6d8e594', 'TATA 0-2500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:54.808Z'::timestamptz, '2026-07-24T09:30:54.808Z'::timestamptz),
  ('dab6cfda-64df-42e0-9384-1ccd05c59fee', 'CHOLA 7500-20000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:55.585Z'::timestamptz, '2026-07-24T09:30:55.585Z'::timestamptz),
  ('974244df-330c-4d2b-add9-5e8a63fd32e1', 'RELIANCE 12000-20000 GVW ABOVE 5 YEAR ONLY', 1, '2026-07-24T09:30:56.160Z'::timestamptz, '2026-07-24T09:30:56.160Z'::timestamptz),
  ('63173db9-e7ac-4b1c-9540-76272dead2c6', 'RELIANCE ABOVE 50000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:56.724Z'::timestamptz, '2026-07-24T09:30:56.724Z'::timestamptz),
  ('db6fe2d6-69ff-43f9-b204-7f71636eef37', 'UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:57.261Z'::timestamptz, '2026-07-24T09:30:57.261Z'::timestamptz),
  ('8e7c88e4-a1e2-427c-9b51-519fd18de8a3', 'UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:57.663Z'::timestamptz, '2026-07-24T09:30:57.663Z'::timestamptz),
  ('c29d27fb-cccf-4258-95f1-acbba599f268', 'TATA & RELIANCE 0-2500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:58.166Z'::timestamptz, '2026-07-24T09:30:58.166Z'::timestamptz),
  ('3d3fb375-2f53-4f89-8de7-83942fca92ce', 'ROYAL 12000-40000 GVW NORMAL ONLY', 1, '2026-07-24T09:30:59.037Z'::timestamptz, '2026-07-24T09:30:59.037Z'::timestamptz),
  ('01597059-b57e-4c54-a9ac-0b489d3703a3', 'MAGMA ABOVE 40000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:59.486Z'::timestamptz, '2026-07-24T09:30:59.486Z'::timestamptz),
  ('c7e286c5-4267-4e6c-baa9-c819c944a411', 'RELIANCE 12000-40000 GVW ABOVE 5 YEAR ONLY', 1, '2026-07-24T09:30:59.940Z'::timestamptz, '2026-07-24T09:30:59.940Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."company_details": 46 rows
INSERT INTO "public"."company_details" ("id", "name", "status", "createdAt", "updatedAt")
VALUES
  ('d9b0f5a6-52e7-48c0-86b6-f39296a452f4', 'CHOLA 2501-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:10.580Z'::timestamptz, '2026-07-24T09:30:10.580Z'::timestamptz),
  ('a35be653-5e61-45fc-aefe-510e4e37873b', 'SHRIRAM 0-2800 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:11.058Z'::timestamptz, '2026-07-24T09:30:11.058Z'::timestamptz),
  ('39d7051c-02e7-479b-b3ed-1dcefeb92332', 'TATA 2501-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:11.539Z'::timestamptz, '2026-07-24T09:30:11.539Z'::timestamptz),
  ('e6121b5a-4830-453b-9843-5ef1ec6dc6d2', 'SBI 0-2000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:12.001Z'::timestamptz, '2026-07-24T09:30:12.001Z'::timestamptz),
  ('b263054b-81da-4986-b142-2afc54aabfa4', 'SBI 12000-40000 GVW NORMAL ABOVE 5 YEAR', 1, '2026-07-24T09:30:12.547Z'::timestamptz, '2026-07-24T09:30:12.547Z'::timestamptz),
  ('6b425be0-f951-41f3-8ed4-a16f7dfacfc3', 'MAGMA 12000-40000 GVW NORMAL ABOVE 5 YEAR', 1, '2026-07-24T09:30:13.055Z'::timestamptz, '2026-07-24T09:30:13.055Z'::timestamptz),
  ('dde1172c-fb32-4e28-82bd-127b3ca56183', 'MAGMA 20000-40000 GVW NIL DEP', 1, '2026-07-24T09:30:13.497Z'::timestamptz, '2026-07-24T09:30:13.497Z'::timestamptz),
  ('a0493d84-383f-4965-8013-381ede600b79', 'SHRIRAM 7500-42500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:14.001Z'::timestamptz, '2026-07-24T09:30:14.001Z'::timestamptz),
  ('9ef0a7c0-ab86-450f-b28e-d896d15824d3', 'TATA 3501-12000 GVW NIL DEP & NORMAL', 1, '2026-07-24T09:30:14.804Z'::timestamptz, '2026-07-24T09:30:14.804Z'::timestamptz),
  ('5588b109-5875-4bf0-aaa9-966678bd9b1a', 'CHOLA 20000-40000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:15.241Z'::timestamptz, '2026-07-24T09:30:15.241Z'::timestamptz),
  ('66235167-c2d8-45ac-923c-0fbd748bc74f', 'ICICI 3500 -7500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:15.966Z'::timestamptz, '2026-07-24T09:30:15.966Z'::timestamptz),
  ('8d9889a6-c0eb-4068-9c93-0f1c57602af1', 'GO DIGIT 20000-43000 GVW ABOVE 5 YEAR', 1, '2026-07-24T09:30:16.421Z'::timestamptz, '2026-07-24T09:30:16.421Z'::timestamptz),
  ('d5a0a654-4659-46e0-b9c0-94863dc0c9d2', 'TAXI NIL DEP NORMAL RELIANCE / SHRIRAM/SBI', 1, '2026-07-24T09:30:16.891Z'::timestamptz, '2026-07-24T09:30:16.891Z'::timestamptz),
  ('05e1ae3a-1684-4d36-a1cb-d98cca5333ce', 'ICICI 7500-11990 GVW NORMAL', 1, '2026-07-24T09:30:17.276Z'::timestamptz, '2026-07-24T09:30:17.276Z'::timestamptz),
  ('e38b617a-34e8-4934-8535-eaea9f06807d', 'ICICI 7500-11990 GVW NIL DEP', 1, '2026-07-24T09:30:17.841Z'::timestamptz, '2026-07-24T09:30:17.841Z'::timestamptz),
  ('9f435d83-54cf-4c24-a9b3-a5298e60e943', 'SCHOOL BUS RELIANCE/TATA/GO DIGIT', 1, '2026-07-24T09:30:18.297Z'::timestamptz, '2026-07-24T09:30:18.297Z'::timestamptz),
  ('a8be15d6-4761-459a-8920-e8f2b56aefe5', 'MAGMA 20000-40000 GVW NORMAL BELOW 5 YEAR', 1, '2026-07-24T09:30:18.820Z'::timestamptz, '2026-07-24T09:30:18.820Z'::timestamptz),
  ('a0569003-b2a6-46e9-9f30-048c655b0971', 'LIBERTY 0-2500 GVW NORMAL AND NIL DEP', 1, '2026-07-24T09:30:19.451Z'::timestamptz, '2026-07-24T09:30:19.451Z'::timestamptz),
  ('ce7441b3-32e9-483b-8d78-453245d2e87a', 'UNIVERSAL SOMPO 3500-20000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:19.860Z'::timestamptz, '2026-07-24T09:30:19.860Z'::timestamptz),
  ('8901fce5-fce1-415d-881a-93d6a1363462', 'SHRIRAM ABOVE 50000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:20.255Z'::timestamptz, '2026-07-24T09:30:20.255Z'::timestamptz),
  ('710e4274-1c9b-4bb1-a534-6b03d7bf3e5f', 'ICICI 0-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:20.680Z'::timestamptz, '2026-07-24T09:30:20.680Z'::timestamptz),
  ('d66b5911-b098-4d49-929f-0f3863235695', 'SBI 2500-3500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:21.427Z'::timestamptz, '2026-07-24T09:30:21.427Z'::timestamptz),
  ('efd3fdf7-3ebb-4c63-b80a-f2115e5e1bac', 'RELIANCE 40001-50000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:21.907Z'::timestamptz, '2026-07-24T09:30:21.907Z'::timestamptz),
  ('b69daf9b-7bd1-4562-b5f5-fe2057566157', 'SHRIRAM 15 YEARS OLD 0-2800 GVW', 1, '2026-07-24T09:30:22.421Z'::timestamptz, '2026-07-24T09:30:22.421Z'::timestamptz),
  ('c5b113e9-dbf3-4cff-8c9a-f809e4b4ee3b', 'SHRIRAM 15 YEARS OLD 7500-42500 GVW', 1, '2026-07-24T09:30:23.002Z'::timestamptz, '2026-07-24T09:30:23.002Z'::timestamptz),
  ('e7b908e1-2701-4da4-9744-6efcede546a8', 'UNITED & IFFCO  MAXI UPTO 20 SEATER', 1, '2026-07-24T09:30:23.481Z'::timestamptz, '2026-07-24T09:30:23.481Z'::timestamptz),
  ('f61f6103-6268-41a7-9d97-d31422e88060', 'FUTURE 3500-7500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:24.101Z'::timestamptz, '2026-07-24T09:30:24.101Z'::timestamptz),
  ('ffaffe9b-4251-4aa3-bb3f-beaa09355eab', 'SBI 12000-40000 GVW BELOW 5 YEAR NIL DEP AND NORMAL', 1, '2026-07-24T09:30:24.673Z'::timestamptz, '2026-07-24T09:30:24.673Z'::timestamptz),
  ('76d94cf6-0bc5-4bb6-9ffb-cb5fdbb47120', 'ROYAL 12000-20000 GVW NIL DEP', 1, '2026-07-24T09:30:25.249Z'::timestamptz, '2026-07-24T09:30:25.249Z'::timestamptz),
  ('5dd6a775-f2b2-4b58-bba9-e8a2c3c82ecd', 'MAGMA 7500-12000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:25.747Z'::timestamptz, '2026-07-24T09:30:25.747Z'::timestamptz),
  ('09444c32-b587-48b0-a57f-845c744686de', 'GENERALI CENTRAL (FUTURE) 0-3500 GVW NIL DEP & NORMAL', 1, '2026-07-24T09:30:26.246Z'::timestamptz, '2026-07-24T09:30:26.246Z'::timestamptz),
  ('a96400f0-2bf4-4f0e-8137-d537889eb6c1', 'SHRIRAM 3500-7500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:27.054Z'::timestamptz, '2026-07-24T09:30:27.054Z'::timestamptz),
  ('20ac018a-3a12-46e1-8f48-906ec877be0c', 'HDFC 0-2500 GVW NORMAL & NIL DEP', 1, '2026-07-24T09:30:27.653Z'::timestamptz, '2026-07-24T09:30:27.653Z'::timestamptz),
  ('cc713152-afb8-4343-84c2-d8cf270e2e4c', 'HDFC 2501-3500 GVW NORMAL & NIL DEP', 1, '2026-07-24T09:30:28.260Z'::timestamptz, '2026-07-24T09:30:28.260Z'::timestamptz),
  ('f6bdb66c-d5d4-4d04-bdf6-ad3e6dc53fb4', 'ROYAL 12000-20000 GVW NORMAL', 1, '2026-07-24T09:30:28.785Z'::timestamptz, '2026-07-24T09:30:28.785Z'::timestamptz),
  ('04fb67fd-71ad-4c33-8467-f78ec7aee80a', 'SBI ABOVE 40000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:29.410Z'::timestamptz, '2026-07-24T09:30:29.410Z'::timestamptz),
  ('58ab3e19-b906-4f79-81e5-ab3a28e34688', 'TATA 0-2500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:29.938Z'::timestamptz, '2026-07-24T09:30:29.938Z'::timestamptz),
  ('5d09e379-87d6-4168-b869-fd333614e2eb', 'CHOLA 7500-20000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:30.536Z'::timestamptz, '2026-07-24T09:30:30.536Z'::timestamptz),
  ('bd41c616-f9e1-46ae-9a2e-023d8df3b9e7', 'RELIANCE 12000-20000 GVW ABOVE 5 YEAR ONLY', 1, '2026-07-24T09:30:31.100Z'::timestamptz, '2026-07-24T09:30:31.100Z'::timestamptz),
  ('6604c0d6-c36d-4755-8d21-b4d8f91ced3c', 'RELIANCE ABOVE 50000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:31.659Z'::timestamptz, '2026-07-24T09:30:31.659Z'::timestamptz),
  ('773a7a58-38bd-4ef3-a6f6-890b83e92cc0', 'UNIVERSAL SOMPO 20001-45000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:32.145Z'::timestamptz, '2026-07-24T09:30:32.145Z'::timestamptz),
  ('a56e5b14-a6de-45cc-8025-a8fa9b762b09', 'UNIVERSAL SOMPO ABOVE 45000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:32.771Z'::timestamptz, '2026-07-24T09:30:32.771Z'::timestamptz),
  ('d2c46203-2d0e-4acf-bc00-d06dfb34e8e7', 'TATA & RELIANCE 0-2500 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:33.175Z'::timestamptz, '2026-07-24T09:30:33.175Z'::timestamptz),
  ('4f590a95-28ef-4525-983a-2c77093fa921', 'ROYAL 12000-40000 GVW NORMAL ONLY', 1, '2026-07-24T09:30:33.776Z'::timestamptz, '2026-07-24T09:30:33.776Z'::timestamptz),
  ('b8f1dd88-20ae-4fb6-837a-6fd5d702e95a', 'MAGMA ABOVE 40000 GVW NIL DEP AND NORMAL', 1, '2026-07-24T09:30:34.474Z'::timestamptz, '2026-07-24T09:30:34.474Z'::timestamptz),
  ('5cf8dd4c-2e15-4edf-9247-9e5e55d67538', 'RELIANCE 12000-40000 GVW ABOVE 5 YEAR ONLY', 1, '2026-07-24T09:30:34.992Z'::timestamptz, '2026-07-24T09:30:34.992Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."rate_tables": 0 rows
-- Table "public"."rate_rules": 0 rows
-- Table "public"."quotation_relationship_details": 46 rows
INSERT INTO "public"."quotation_relationship_details" ("id", "companyId", "categoryId", "percentage", "profit", "status", "addedBy", "updatedBy", "createdAt", "updatedAt", "remarks")
VALUES
  ('d934604a-5ada-41cb-84b3-933086c1858a', 'a96400f0-2bf4-4f0e-8137-d537889eb6c1', 'ce73331f-88b2-49b4-9528-5f936bd1fb78', 37, 5000, 1, NULL, NULL, '2026-07-24T09:32:22.015Z'::timestamptz, '2026-07-24T09:33:02.974Z'::timestamptz, 'ONLY WITH NCB CASES DISCOUNT 80%'),
  ('0eb7454c-63a7-42a6-83e7-1c6d70f26bef', 'ffaffe9b-4251-4aa3-bb3f-beaa09355eab', '64245dd1-1f68-4965-a2ce-1fe42ce77214', 26, 2500, 1, NULL, NULL, '2026-07-24T09:32:20.584Z'::timestamptz, '2026-07-24T09:33:26.102Z'::timestamptz, 'TATA AND AL ONLY. GJ03, GJ17 DECLINE. DISCOUNT 90% Nil dep quote from system'),
  ('6fce91f1-6cdd-49b4-a9d5-5898915f43aa', '5d09e379-87d6-4168-b869-fd333614e2eb', 'dab6cfda-64df-42e0-9384-1ccd05c59fee', 20, 5000, 1, NULL, NULL, '2026-07-24T09:32:26.276Z'::timestamptz, '2026-07-24T09:33:06.285Z'::timestamptz, 'CONFIRM DISCOUNT FROM SYSTEM'),
  ('c9d1cb47-587f-471b-a7bf-2fc2e559916a', '4f590a95-28ef-4525-983a-2c77093fa921', '3d3fb375-2f53-4f89-8de7-83942fca92ce', 29, 3000, 1, NULL, NULL, '2026-07-24T09:32:35.854Z'::timestamptz, '2026-07-24T09:33:14.499Z'::timestamptz, 'TATA & AL MAKE ALL RTO, DISCOUNT 90%'),
  ('39092af8-ae5d-4bea-b1a8-c5893bdd7bb3', 'a8be15d6-4761-459a-8920-e8f2b56aefe5', '23f8ef23-a5e1-486e-904f-fb8e93c15e19', 24, 2500, 1, NULL, NULL, '2026-07-24T09:32:14.623Z'::timestamptz, '2026-07-24T09:33:18.739Z'::timestamptz, 'ALL RTOs. TATA , AL, EICHER ONLY. DISCOUNT AS PER SYSTEM'),
  ('39a4e891-2757-4a54-9ae9-945b7be17e60', 'dde1172c-fb32-4e28-82bd-127b3ca56183', '75f6f90e-3eef-4524-b131-941e025e42b0', 24, 3000, 1, NULL, NULL, '2026-07-24T09:32:09.036Z'::timestamptz, '2026-07-24T09:33:12.972Z'::timestamptz, 'ALL RTOs. TATA , AL, EICHER ONLY. DISCOUNT AS PER SYSTEM'),
  ('1fc7e484-dd66-4aa4-82e5-96c40d70b6bd', 'a0493d84-383f-4965-8013-381ede600b79', 'c3a617e7-bfd9-4644-87ed-bbbabc059714', 27, 3000, 1, NULL, NULL, '2026-07-24T09:32:09.531Z'::timestamptz, '2026-07-24T09:33:13.515Z'::timestamptz, 'DISCOUNT 90% BHARATBENZ DECLINED'),
  ('b4ef9a96-b727-4488-825a-8f03b18b733d', '9ef0a7c0-ab86-450f-b28e-d896d15824d3', '49302053-73b9-4465-ac0e-c56bc940726b', 30, 3000, 1, NULL, NULL, '2026-07-24T09:32:07.698Z'::timestamptz, '2026-07-24T09:33:14.013Z'::timestamptz, 'DISCOUNT 85%. DECLINED RTO (GJ07, 12,13,17,20,23,34,36,39)'),
  ('049ed46d-a846-444c-9772-6e81bf7ebe83', '66235167-c2d8-45ac-923c-0fbd748bc74f', '17f2e250-1352-4780-9456-10dc5a8bc1fa', 40, 2500, 1, NULL, NULL, '2026-07-24T09:32:10.400Z'::timestamptz, '2026-07-24T09:33:15.378Z'::timestamptz, 'DISCOUNT 80% ALL MAKE MODEL ALL RTO (GJ03, 05, 06 HOY TO 1500 Rs + KARVA)'),
  ('ec7c59c3-4ec2-4567-8e05-9fa44e4163b1', '6b425be0-f951-41f3-8ed4-a16f7dfacfc3', 'e7246c1e-c7eb-4d60-a93f-e737f63d59cf', 28, 3000, 1, NULL, NULL, '2026-07-24T09:32:08.569Z'::timestamptz, '2026-07-24T09:33:12.418Z'::timestamptz, 'ALL RTOs. TATA , AL, EICHER ONLY. DISCOUNT 90%'),
  ('bd1459c2-e63c-4baa-bae6-743cc7af10c3', '8d9889a6-c0eb-4068-9c93-0f1c57602af1', '9587e1d3-44e9-448d-b28c-44604c632370', 24, 2500, 1, NULL, NULL, '2026-07-24T09:32:10.948Z'::timestamptz, '2026-07-24T09:33:15.884Z'::timestamptz, 'DISCOUNT 85% ALL MAKE MODEL SPECIAL FOR BHARATBENZ'),
  ('02c6d39a-2c2e-480d-a75a-0b735f57d9ef', 'd5a0a654-4659-46e0-b9c0-94863dc0c9d2', 'c787a00c-0168-4282-967f-a091964cbad1', 30, 2500, 1, NULL, NULL, '2026-07-24T09:32:11.483Z'::timestamptz, '2026-07-24T09:33:16.525Z'::timestamptz, 'DISCOUNT 70%'),
  ('195cd76c-dd74-40c8-b751-78483dbd2bd2', '05e1ae3a-1684-4d36-a1cb-d98cca5333ce', '64e4a022-3391-4939-97a7-7831a7e43fa5', 30, 2500, 1, NULL, NULL, '2026-07-24T09:32:12.198Z'::timestamptz, '2026-07-24T09:33:17.140Z'::timestamptz, 'DISCOUNT 80%'),
  ('d8c38899-5818-4d77-a8e3-9c8fcbd2f837', 'e38b617a-34e8-4934-8535-eaea9f06807d', 'e9d77f2b-79e2-47ea-8977-c6b67b9c8ba4', 30, 3000, 1, NULL, NULL, '2026-07-24T09:32:12.705Z'::timestamptz, '2026-07-24T09:33:17.602Z'::timestamptz, 'DISCOUNT 80%'),
  ('106b12a2-2fc1-4435-80e3-8f3dd79f6485', '9f435d83-54cf-4c24-a9b3-a5298e60e943', '595ec937-4d61-4383-abe8-c8c7114ab17d', 70, 2500, 1, NULL, NULL, '2026-07-24T09:32:13.965Z'::timestamptz, '2026-07-24T09:33:18.154Z'::timestamptz, 'DISCOUNT 95% NIL DEP NOT APPLICABLE ALWAYS NORMAL POLICY, ONLY SCHOOL NA NAME PAR HOVI JOIYE'),
  ('d4ff134c-5be9-4ab1-9428-f1b5a7233748', 'b263054b-81da-4986-b142-2afc54aabfa4', '4340d12c-0a3e-45e9-9211-4f52ed52f63f', 32, 3000, 1, NULL, NULL, '2026-07-24T09:32:08.129Z'::timestamptz, '2026-07-24T09:33:11.973Z'::timestamptz, 'TATA AND AL ONLY. GJ03, GJ17 DECLINE. DISCOUNT 90%.'),
  ('cc412beb-9ad7-4763-b6d4-21218ad4d128', 'a0569003-b2a6-46e9-9f30-048c655b0971', '0c3d6bc7-eea8-4d9f-a54d-537d1fe96f19', 61, 2500, 1, NULL, NULL, '2026-07-24T09:32:15.336Z'::timestamptz, '2026-07-24T09:33:19.291Z'::timestamptz, 'ALL MAKE ALL RTO DISCOUNT 90%'),
  ('58a04db4-62a0-4473-b949-2db8c2ecf1de', 'ce7441b3-32e9-483b-8d78-453245d2e87a', 'b47b204e-8108-471e-ae1b-dc96c0488a96', 24, 3000, 1, NULL, NULL, '2026-07-24T09:32:15.988Z'::timestamptz, '2026-07-24T09:33:20.142Z'::timestamptz, 'DISCOUNT 90% SPECIAL FOR BHARATBENZ'),
  ('d861efeb-5a9d-4bbc-9ab5-44d866d291da', 'b8f1dd88-20ae-4fb6-837a-6fd5d702e95a', '01597059-b57e-4c54-a9ac-0b489d3703a3', 15, 2500, 1, NULL, NULL, '2026-07-24T09:32:41.175Z'::timestamptz, '2026-07-24T09:33:20.640Z'::timestamptz, 'DISCOUNT 85% BHARATBENZ DECLINED'),
  ('99d3b2b2-6b63-4742-885e-28f379252301', '710e4274-1c9b-4bb1-a534-6b03d7bf3e5f', 'd9754add-8388-4ffc-94d0-36801247e5a1', 53, 2500, 1, NULL, NULL, '2026-07-24T09:32:16.884Z'::timestamptz, '2026-07-24T09:33:21.699Z'::timestamptz, 'DISCOUNT 80%,  ALLOWED RTO (GJ01, 02, 08, 09, 10, 14, 15, 16, 21, 25, 32, 33, 36, 37)'),
  ('cb466e68-b336-4853-96e5-981309f74904', '5cf8dd4c-2e15-4edf-9247-9e5e55d67538', 'c7e286c5-4267-4e6c-baa9-c819c944a411', 22, 2500, 1, NULL, NULL, '2026-07-24T09:32:43.259Z'::timestamptz, '2026-07-24T09:33:22.172Z'::timestamptz, 'Discount 90 TATA, AL & EICHER ONLY ALL RTO above 5 year only'),
  ('bd50f681-627c-431e-8a39-d56ba6cc51b7', 'b69daf9b-7bd1-4562-b5f5-fe2057566157', '53307241-9bb7-4cbd-a04a-f38618df1141', 50, 2500, 1, NULL, NULL, '2026-07-24T09:32:17.945Z'::timestamptz, '2026-07-24T09:33:23.126Z'::timestamptz, ''),
  ('8b2959db-ca68-4954-a0cf-4f280acd90af', 'c5b113e9-dbf3-4cff-8c9a-f809e4b4ee3b', '2f36d93e-f2c5-4945-9243-8668d6ad79b6', 20, 2500, 1, NULL, NULL, '2026-07-24T09:32:18.767Z'::timestamptz, '2026-07-24T09:33:23.575Z'::timestamptz, ''),
  ('3385e35f-2476-4313-8879-75240077412e', 'e7b908e1-2701-4da4-9744-6efcede546a8', 'afd2891e-29fe-4e6b-af12-daea2e2b6498', 15, 2500, 1, NULL, NULL, '2026-07-24T09:32:45.558Z'::timestamptz, '2026-07-24T09:33:24.029Z'::timestamptz, 'DISCOUNT UNITED 80%, IFFCO 70%'),
  ('265e2c61-5fc4-467f-aea1-506c1496a0c5', '5dd6a775-f2b2-4b58-bba9-e8a2c3c82ecd', '00e7ca9a-12ae-408e-96c1-48cc97bc709d', 24, 2500, 1, NULL, NULL, '2026-07-24T09:32:20.104Z'::timestamptz, '2026-07-24T09:33:24.982Z'::timestamptz, 'TATA, AL & EICHER, DISCOUNT AS PER SYSTEM'),
  ('24868c56-25e1-46cb-8a01-14449ef1bf08', '76d94cf6-0bc5-4bb6-9ffb-cb5fdbb47120', '1d9999ad-1dcd-47e1-a8c6-a5fcdc55d22c', 23, 2500, 1, NULL, NULL, '2026-07-24T09:32:21.302Z'::timestamptz, '2026-07-24T09:33:25.499Z'::timestamptz, 'TATA & AL MAKE DISCOUNT 90% Nil dep quote from system'),
  ('5e8b0730-449d-4535-929e-f63497e62790', '39d7051c-02e7-479b-b3ed-1dcefeb92332', '105e4285-66bb-494d-832d-fc44f5ba956d', 53, 2500, 1, NULL, NULL, '2026-07-24T09:32:48.094Z'::timestamptz, '2026-07-24T09:33:26.552Z'::timestamptz, 'DISCOUNT 80%'),
  ('e3dc06fe-bbc8-4a41-8dd3-2a465b8d0841', 'a35be653-5e61-45fc-aefe-510e4e37873b', '23aed9b2-81db-4248-9cc5-a94d29440b42', 58, 2500, 1, NULL, NULL, '2026-07-24T09:32:06.766Z'::timestamptz, '2026-07-24T09:33:09.580Z'::timestamptz, 'ALL MODELS ALL RTOs. DISCOUNT 80%'),
  ('453bd514-008d-4a94-a418-b978e59c05da', '58ab3e19-b906-4f79-81e5-ab3a28e34688', '1b40b5c1-d15a-4be2-af5a-592ce6d8e594', 53, 2500, 1, NULL, NULL, '2026-07-24T09:32:25.618Z'::timestamptz, '2026-07-24T09:33:10.012Z'::timestamptz, 'ALL MODELS ALL RTOs. DISCOUNT 80%'),
  ('ba3f07d6-ae90-4a15-8312-1fef1d2d81be', 'd66b5911-b098-4d49-929f-0f3863235695', '90aaecc4-c496-4d62-8bc9-63ca34ced6d8', 55, 2500, 1, NULL, NULL, '2026-07-24T09:32:13.418Z'::timestamptz, '2026-07-24T09:33:11.455Z'::timestamptz, 'DECLINED RTO FOR BOLERO MODEL ONLY (GJ02, 03, 08,09,12, 17, 24, 31)'),
  ('ddc03c77-b7a1-4483-816e-b87e4b470aee', '20ac018a-3a12-46e1-8f48-906ec877be0c', 'ae2d243c-96fe-4649-8f1c-566b1870795d', 63, 5000, 1, NULL, NULL, '2026-07-24T09:32:22.725Z'::timestamptz, '2026-07-24T09:33:03.444Z'::timestamptz, 'DISCOUNT 90% ALL MAKE MODEL ALL RTO'),
  ('c0a628d5-591c-4c70-86d9-ba0ba9c6a440', 'cc713152-afb8-4343-84c2-d8cf270e2e4c', '283df45d-8ca0-41e2-a9bb-62c10f407162', 50, 4500, 1, NULL, NULL, '2026-07-24T09:32:23.281Z'::timestamptz, '2026-07-24T09:33:04.003Z'::timestamptz, 'DISCOUNT 90% ALL MAKE MODEL ALL RTO'),
  ('23e702b1-2378-4ea4-8926-d58630987ebe', 'f6bdb66c-d5d4-4d04-bdf6-ad3e6dc53fb4', '234f231c-78a0-4abc-a062-1209dd877ce1', 30, 5000, 1, NULL, NULL, '2026-07-24T09:32:24.134Z'::timestamptz, '2026-07-24T09:33:04.805Z'::timestamptz, 'DISCOUNT 90% TATA & AL ONLY'),
  ('12ac4b0d-fe99-48b3-a306-95718f0fff5e', '04fb67fd-71ad-4c33-8467-f78ec7aee80a', '00691ded-12ab-4ffe-91ca-d849a5d0f9d7', 16, 5500, 1, NULL, NULL, '2026-07-24T09:32:24.910Z'::timestamptz, '2026-07-24T09:33:05.233Z'::timestamptz, 'DISCOUNT 85%'),
  ('bb1b2d5d-862f-4278-b68c-e77ed16078af', 'd2c46203-2d0e-4acf-bc00-d06dfb34e8e7', 'c29d27fb-cccf-4258-95f1-acbba599f268', 63, 2500, 1, NULL, NULL, '2026-07-24T09:32:31.929Z'::timestamptz, '2026-07-24T09:33:10.490Z'::timestamptz, 'ALL MODELS ALL RTOs'),
  ('1f10b003-e308-41c9-9aa2-becc7229dba8', 'bd41c616-f9e1-46ae-9a2e-023d8df3b9e7', '974244df-330c-4d2b-add9-5e8a63fd32e1', 20, 5000, 1, NULL, NULL, '2026-07-24T09:32:27.276Z'::timestamptz, '2026-07-24T09:33:07.010Z'::timestamptz, 'DISCOUNT 90% ALL RTO TATA AL & EICHER'),
  ('72c03b17-27d7-48ea-b84f-c367eaa2cd45', '6604c0d6-c36d-4755-8d21-b4d8f91ced3c', '63173db9-e7ac-4b1c-9540-76272dead2c6', 15, 5500, 1, NULL, NULL, '2026-07-24T09:32:28.036Z'::timestamptz, '2026-07-24T09:33:07.452Z'::timestamptz, 'ADDITONAL TOWING COMPULSORY DISCOUNT 85%'),
  ('f2ecda9c-d6c0-414e-866e-6f70fdd98a58', '773a7a58-38bd-4ef3-a6f6-890b83e92cc0', 'db6fe2d6-69ff-43f9-b204-7f71636eef37', 32, 6000, 1, NULL, NULL, '2026-07-24T09:32:28.586Z'::timestamptz, '2026-07-24T09:33:08.008Z'::timestamptz, 'ALL MAKE  MODEL ALL RTO DISCOUNT 90% BHARATBENZ DECLINED'),
  ('6217c3ac-ea42-4d3d-acf6-741387fd198b', 'a56e5b14-a6de-45cc-8025-a8fa9b762b09', '8e7c88e4-a1e2-427c-9b51-519fd18de8a3', 28, 6000, 1, NULL, NULL, '2026-07-24T09:32:29.109Z'::timestamptz, '2026-07-24T09:33:08.506Z'::timestamptz, 'ALL MAKE  MODEL ALL RTO DISCOUNT 90% BHARATBENZ DECLINED'),
  ('379b86ba-66c9-4673-9a66-3dce94e3127c', 'd9b0f5a6-52e7-48c0-86b6-f39296a452f4', 'bb6fc49e-42c1-46a4-ad70-032f9ca01510', 60, 2500, 1, NULL, NULL, '2026-07-24T09:32:06.138Z'::timestamptz, '2026-07-24T09:33:09.098Z'::timestamptz, 'ALL MODELS ALL RTOs. DISCOUNT 80%. PA COVER Rs. 550/- Compulsory'),
  ('080f966f-a4c0-4139-a297-4dc01cf8184e', 'e6121b5a-4830-453b-9843-5ef1ec6dc6d2', 'ed339ff6-83c4-4fb1-91d9-8fcb7c547249', 64, 2500, 1, NULL, NULL, '2026-07-24T09:32:07.204Z'::timestamptz, '2026-07-24T09:33:10.966Z'::timestamptz, 'UPTO 2500 GVW IF TATA MODEL, ALL MODELS ALL RTOs. DISCOUNT 80%.'),
  ('3337849c-6bd9-4923-a576-f89ee33a3e89', '5588b109-5875-4bf0-aaa9-966678bd9b1a', '78718fa8-9e3a-41d6-8b0d-74e046f1d164', 33, 3000, 1, NULL, NULL, '2026-07-24T09:32:09.928Z'::timestamptz, '2026-07-24T09:33:14.943Z'::timestamptz, 'ALL MAKE ALL RTO, DISCOUNT 87.5% FOR BHARATBENZ 85% DISCOUNT'),
  ('f3b82a41-24b6-4531-884d-5882d2720580', '8901fce5-fce1-415d-881a-93d6a1363462', '1e208c98-e5e8-47bc-8e71-fcfd05099abc', 15, 2500, 1, NULL, NULL, '2026-07-24T09:32:16.397Z'::timestamptz, '2026-07-24T09:33:21.174Z'::timestamptz, 'DISCOUNT 90% BHARATBENZ DECLINED'),
  ('4c39b087-118a-4642-a367-ce005bb4857c', 'efd3fdf7-3ebb-4c63-b80a-f2115e5e1bac', 'a998c4a1-ef75-4154-bc3b-87ff1ff96e81', 27, 3000, 1, NULL, NULL, '2026-07-24T09:32:17.313Z'::timestamptz, '2026-07-24T09:33:22.645Z'::timestamptz, 'Discount 90 TATA, AL & EICHER ONLY ALL RTO above 5 year only'),
  ('870c457e-5d8a-4afc-9acf-129a224e73df', 'f61f6103-6268-41a7-9d97-d31422e88060', '3da97fe8-85a2-435f-803f-7645d10585c7', 35, 2500, 1, NULL, NULL, '2026-07-24T09:32:19.413Z'::timestamptz, '2026-07-24T09:33:24.546Z'::timestamptz, 'DECLINED RTO: GJ10, 17, 20, 25, 35'),
  ('9cbcc050-c7d2-4e72-8062-9bafd0e467d5', '09444c32-b587-48b0-a57f-845c744686de', 'abaee7ef-db44-4ff6-95c7-d802cea8a76e', 60, 3000, 1, NULL, NULL, '2026-07-24T09:32:48.570Z'::timestamptz, '2026-07-24T09:33:27.132Z'::timestamptz, 'DECLINE RTO GJ10, 17, 20, 25, 35')
ON CONFLICT DO NOTHING;

-- Table "public"."addons": 0 rows
-- Table "public"."predefined_responses": 33 rows
INSERT INTO "public"."predefined_responses" ("id", "text", "isActive", "orderIndex", "requiresFollowUp", "createdAt", "updatedAt")
VALUES
  ('b92e5567-1606-482b-9429-6dfeaec27c95', 'પૈસાનો વેંત નથી.', TRUE, 1, TRUE, '2026-08-19T08:40:34.163Z'::timestamptz, '2026-08-19T08:40:34.163Z'::timestamptz),
  ('76506a4a-6747-49c5-a969-45bc3a457826', 'ગાડી વેચી નાખી. નવા ઓનરનો કોન્ટેક્ટ નથી થયો.', TRUE, 2, FALSE, '2026-08-19T08:40:34.285Z'::timestamptz, '2026-08-19T08:40:34.285Z'::timestamptz),
  ('bbb94ebf-affc-4f9f-bcbe-811bd825331e', 'રોંગ નંબર', TRUE, 3, FALSE, '2026-08-19T08:40:34.389Z'::timestamptz, '2026-08-19T08:40:34.389Z'::timestamptz),
  ('9da85a66-9739-4182-a415-db2ed4228943', 'બંધ નંબર', TRUE, 4, FALSE, '2026-08-19T08:40:34.493Z'::timestamptz, '2026-08-19T08:40:34.493Z'::timestamptz),
  ('2ae6a4b2-c05b-48ab-b0c1-dcd06307d986', 'એજન્ટ નંબર', TRUE, 5, FALSE, '2026-08-19T08:40:34.599Z'::timestamptz, '2026-08-19T08:40:34.599Z'::timestamptz),
  ('50597428-b538-42c9-aa6c-e7104eaee645', 'ફોન લાગે છે પણ રિસિવ નથી કરતા', TRUE, 6, TRUE, '2026-08-19T08:40:34.701Z'::timestamptz, '2026-08-19T08:40:34.701Z'::timestamptz),
  ('43c8d83c-2bb3-4c8d-aba5-228aa42961fa', 'ગાડી પડતર છે.', TRUE, 7, FALSE, '2026-08-19T08:40:34.801Z'::timestamptz, '2026-08-19T08:40:34.801Z'::timestamptz),
  ('18723f0f-d7d2-4609-abed-8cc5358b840b', 'મોંઘુ પડ્યું અને ANGEL ના રેટમાં પણ ન માન્યા.', TRUE, 8, FALSE, '2026-08-19T08:40:34.901Z'::timestamptz, '2026-08-19T08:40:34.901Z'::timestamptz),
  ('c66260a4-eace-4613-9d2b-7b040bd5aa26', 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.', TRUE, 9, FALSE, '2026-08-19T08:40:35.002Z'::timestamptz, '2026-08-19T08:40:35.002Z'::timestamptz),
  ('e723f18c-96ec-4d17-89d5-ec8211d44ff7', 'સમયસર ક્વોટેશન ના આપ્યું એટલે બીજા પાસે કરાવી લીધો', TRUE, 10, FALSE, '2026-08-19T08:40:35.100Z'::timestamptz, '2026-08-19T08:40:35.100Z'::timestamptz),
  ('ba78500a-2d68-4c67-8eb7-dd22d0e74ab4', 'એને જે કંપની માં કરવો હતો એમાં આપણાથી ના થયો', TRUE, 11, FALSE, '2026-08-19T08:40:35.196Z'::timestamptz, '2026-08-19T08:40:35.196Z'::timestamptz),
  ('fb3c34e5-e9d4-4f3f-a38b-b8f5356e6a26', 'એના એજન્ટ પાસે જ કરાવવો છે એવી જીદ છે.', TRUE, 12, FALSE, '2026-08-19T08:40:35.313Z'::timestamptz, '2026-08-19T08:40:35.313Z'::timestamptz),
  ('d650c1f0-307c-4aaa-ace2-b89250d0bbd6', 'શોરૂમમાં કરાવવો છે / કરાવી લીધો', TRUE, 13, FALSE, '2026-08-19T08:40:35.427Z'::timestamptz, '2026-08-19T08:40:35.427Z'::timestamptz),
  ('6858117a-8fb7-45bc-a5ee-6c2ad39f6a6f', 'આપણા ઉપર વિશ્વાસ ના આવ્યો એટલે ના કરાવ્યો', TRUE, 14, FALSE, '2026-08-19T08:40:35.531Z'::timestamptz, '2026-08-19T08:40:35.531Z'::timestamptz),
  ('a2621cf4-f37e-4aac-9093-e620dc5b1ad4', 'વાત જ કરવા તૈયાર નથી. ફોન કાપી નાખે છે.', TRUE, 15, FALSE, '2026-08-19T08:40:35.631Z'::timestamptz, '2026-08-19T08:40:35.631Z'::timestamptz),
  ('51020d47-ff8e-4cf9-a5d6-e8048b757f96', 'હવે મને ફોન ના કરતા એવું કીધેલ છે.', TRUE, 16, FALSE, '2026-08-19T08:40:35.727Z'::timestamptz, '2026-08-19T08:40:35.727Z'::timestamptz),
  ('85e6ce10-52eb-49e5-9f2e-20d12ab109dc', 'છેલ્લે સુધી હા માં હા કરી પછી બીજે કરાવી લીધો. કારણ ના કીધું', TRUE, 17, FALSE, '2026-08-19T08:40:35.827Z'::timestamptz, '2026-08-19T08:40:35.827Z'::timestamptz),
  ('f9fafd54-eff4-472c-9240-52d09106b3f2', 'એને સાવ ઓછા માં કરવો હતો એટલે આપણે ના કર્યો', TRUE, 18, FALSE, '2026-08-19T08:40:35.931Z'::timestamptz, '2026-08-19T08:40:35.931Z'::timestamptz),
  ('8bcb5d0b-a6d1-4cd4-91fa-0e17ee8dba47', 'બાકી માં કરવો હતો એટલે મેળ ના પડ્યો', TRUE, 19, FALSE, '2026-08-19T08:40:36.031Z'::timestamptz, '2026-08-19T08:40:36.031Z'::timestamptz),
  ('39c4f198-db8a-437f-a93a-90996b66c288', 'ગયા વર્ષે ફક્ત નામ ટ્રાન્સફર માટે વીમો કરાવ્યો હતો', TRUE, 20, FALSE, '2026-08-19T08:40:36.131Z'::timestamptz, '2026-08-19T08:40:36.131Z'::timestamptz),
  ('12dfd60c-5e49-4acd-ad54-f810f1787480', 'આપણા થી અપસેટ છે એટલે બીજા પાસે કરાવી લીધો', TRUE, 21, FALSE, '2026-08-19T08:40:36.230Z'::timestamptz, '2026-08-19T08:40:36.230Z'::timestamptz),
  ('8386f4b3-9537-4f12-901c-22618df76c12', 'પહેલી વાર કોલ કર્યો ત્યારે જ એમ કીધું કે વીમો ભરાઈ ગયો છે', TRUE, 22, FALSE, '2026-08-19T08:40:36.331Z'::timestamptz, '2026-08-19T08:40:36.331Z'::timestamptz),
  ('fcd677a4-26c6-49e0-9dd6-df28215a479a', 'હજી ફોલોઅપ ચાલુ છે. કરાવે એવા ચાન્સ છે.', TRUE, 23, TRUE, '2026-08-19T08:40:36.438Z'::timestamptz, '2026-08-19T08:40:36.438Z'::timestamptz),
  ('fc1d797f-8a10-47b6-9568-43ede1179c9b', 'ચોખી ના જ પાડે છે વીમો ભરવો નથી', TRUE, 24, FALSE, '2026-08-19T08:40:36.543Z'::timestamptz, '2026-08-19T08:40:36.543Z'::timestamptz),
  ('1032ae5a-1b0b-4213-9efb-e531c186f0d3', 'એને ઘરનો કોડ છે', TRUE, 25, FALSE, '2026-08-19T08:40:36.661Z'::timestamptz, '2026-08-19T08:40:36.661Z'::timestamptz),
  ('0b1764b9-8159-4f5d-9484-b721c5cecbb0', 'RENEWAL લીસ્ટ મા છે', TRUE, 26, FALSE, '2026-08-19T08:40:36.765Z'::timestamptz, '2026-08-19T08:40:36.765Z'::timestamptz),
  ('8f253b3a-bbbc-4d36-a15f-449ac6ed7b6c', 'SCHOOL BUS છે', TRUE, 27, FALSE, '2026-08-19T08:40:36.865Z'::timestamptz, '2026-08-19T08:40:36.865Z'::timestamptz),
  ('f3e48fd1-11a7-4646-b87d-ee27552786e4', 'TAKEN LIST મા છે', TRUE, 28, FALSE, '2026-08-19T08:40:36.969Z'::timestamptz, '2026-08-19T08:40:36.969Z'::timestamptz),
  ('edd9a3cf-8269-4c43-bca9-d74b0f1e9c1f', 'મોરબી જિલ્લા બહારની ગાડી છે એટલે વિશ્વાસ ન આવ્યો', TRUE, 29, FALSE, '2026-08-19T08:40:37.074Z'::timestamptz, '2026-08-19T08:40:37.074Z'::timestamptz),
  ('f9cca4aa-4d5a-46c2-9f0d-0695e75ee2dd', 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો', TRUE, 30, FALSE, '2026-08-19T08:40:37.174Z'::timestamptz, '2026-08-19T08:40:37.174Z'::timestamptz),
  ('9af5a021-bb29-406b-9433-aed5d49b7a14', 'લોન / હપ્તા ન ભરવાને કારણે ફાઈનાન્સ વાળા ગાડી લઇ ગયા.', TRUE, 31, FALSE, '2026-08-19T08:40:37.283Z'::timestamptz, '2026-08-19T08:40:37.283Z'::timestamptz),
  ('68121cfb-3478-4aa6-b689-42bb93c3bfb7', 'ગાડી સ્ક્રેપમાં આપી દીધી / રજીસ્ટ્રેશન નંબર કેન્સલ થઇ ગયા.', TRUE, 32, FALSE, '2026-08-19T08:40:37.386Z'::timestamptz, '2026-08-19T08:40:37.386Z'::timestamptz),
  ('4b42b10d-fd3d-494c-ab66-047600ca47b9', 'વીમા ની expiry date અલગ છે. Exp Date:_________', TRUE, 33, TRUE, '2026-08-19T08:40:37.487Z'::timestamptz, '2026-08-19T08:40:37.487Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."system_settings": 0 rows
-- Table "public"."leads": 13 rows
INSERT INTO "public"."leads" ("id", "assignedTo", "clientName", "clientEmail", "clientPhone", "status", "createdAt", "updatedAt", "vehicleNo", "expiryDate", "registrationDate", "gvw", "address", "messageTemplate", "existingAgent", "city", "importName", "customFields", "deletedAt", "deletedBy")
VALUES
  ('1fb2e641-8d3d-40da-821d-2362827ccbcc', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', 'SANDIPBHAI', NULL, '7096601117', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:21.051Z'::timestamptz, 'GJ18AV5577', '2026-06-05T00:00:00.000Z'::timestamptz, '2012-07-18T00:00:00.000Z'::timestamptz, '25000', 'VIDHUT NAGAR OPP CIRCUT HOUSE,AT MORBI,DIS MORBI,999999', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"VIDHUT NAGAR OPP CIRCUT HOUSE,AT MORBI,DIS MORBI,999999","Contact":"7096601117","Column_8":"Agent Number","Owner Name":"SANDIPBHAI","Vehicle No":"GJ18AV5577","GVW (In Kg.)":25000,"Registration Date":"18/07/12","Insurance Validity":"05/06/26"}'::jsonb, NULL, NULL),
  ('e8b8d485-f8c2-4754-9371-0e96cd6601bf', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', 'CHAMUNDA LOGISTICS', NULL, '9979445009', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:21.051Z'::timestamptz, 'GJ36X3952', '2026-06-05T00:00:00.000Z'::timestamptz, '2025-06-11T00:00:00.000Z'::timestamptz, '55000', 'SURVEY NO 59 2P2,AT NAVA SADULKA,,363670', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"SURVEY NO 59 2P2,AT NAVA SADULKA,,363670","Contact":"9979445009","Column_8":9979445009,"Owner Name":"CHAMUNDA LOGISTICS","Vehicle No":"GJ36X3952","GVW (In Kg.)":55000,"Registration Date":"11/06/25","Insurance Validity":"05/06/26"}'::jsonb, NULL, NULL),
  ('c144cfcc-72fe-4df0-ace7-eb6a5fe45e35', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', 'VASIMBHAI', NULL, '9624739296', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:21.999Z'::timestamptz, 'GJ36T1811', '2026-06-05T00:00:00.000Z'::timestamptz, '2016-09-29T00:00:00.000Z'::timestamptz, '2620', 'NANI BAZAR,VORAVAD,RAJA PCO STREET,,MORBI,363641', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"NANI BAZAR,VORAVAD,RAJA PCO STREET,,MORBI,363641","Contact":"9624739296","Column_8":9624739296,"Owner Name":"VASIMBHAI","Vehicle No":"GJ36T1811","GVW (In Kg.)":2620,"Registration Date":"29/09/16","Insurance Validity":"05/06/26"}'::jsonb, NULL, NULL),
  ('30747d5e-45c7-49ce-9713-8852f8a75e4a', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', 'SANDIPBHAI DANGAR', NULL, '9825460900', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:21.999Z'::timestamptz, 'GJ01CU6973', '2026-06-06T00:00:00.000Z'::timestamptz, '2011-03-10T00:00:00.000Z'::timestamptz, '16200', 'MAYUR NAGAR,AT HALVAD,TA HALVAD,363351', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"MAYUR NAGAR,AT HALVAD,TA HALVAD,363351","Contact":"9825460900","Column_8":"Agent Number","Owner Name":"SANDIPBHAI DANGAR","Vehicle No":"GJ01CU6973","GVW (In Kg.)":16200,"Registration Date":"10/03/11","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL),
  ('fde9b5bf-8ea6-4b0a-95c4-63fd4ff6abfa', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', 'CHETANBHAI KHAKHRIYA', NULL, '9879041723', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:21.999Z'::timestamptz, 'GJ36U8260', '2026-06-06T00:00:00.000Z'::timestamptz, '2022-05-20T00:00:00.000Z'::timestamptz, '818', 'KALIKA PLOT STREET NO 5,NR MASJID MDG,,363641', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"KALIKA PLOT STREET NO 5,NR MASJID MDG,,363641","Contact":"9879041723","Column_8":9879041723,"Owner Name":"CHETANBHAI KHAKHRIYA","Vehicle No":"GJ36U8260","GVW (In Kg.)":818,"Registration Date":"20/05/22","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL),
  ('d07dc9ba-af57-43e4-9531-4ec0b97f217b', '3c1e8734-ac95-4790-90c5-74d9479b1322', 'LABHUBHAI', NULL, '9712710003', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:22.927Z'::timestamptz, 'GJ36U9246', '2026-06-05T00:00:00.000Z'::timestamptz, '2023-01-10T00:00:00.000Z'::timestamptz, '990', 'RAMJI MANDIR VADI SERI,TRAJPAR KHARI,,363642', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"RAMJI MANDIR VADI SERI,TRAJPAR KHARI,,363642","Contact":"9712710003","Column_8":"Agent Number","Owner Name":"LABHUBHAI","Vehicle No":"GJ36U9246","GVW (In Kg.)":990,"Registration Date":"10/01/23","Insurance Validity":"05/06/26"}'::jsonb, NULL, NULL),
  ('b383a596-aacd-450e-8134-8508bc6aa282', '3c1e8734-ac95-4790-90c5-74d9479b1322', 'VANRAJBHAI MAKVANA', NULL, '9913443143', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:22.927Z'::timestamptz, 'GJ36V9074', '2026-06-06T00:00:00.000Z'::timestamptz, '2025-06-09T00:00:00.000Z'::timestamptz, '1820', 'AT KOTHARIYA,TA WANKANER,DIST MORBI,363621', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"AT KOTHARIYA,TA WANKANER,DIST MORBI,363621","Contact":9913443143,"Column_8":8238767272,"Owner Name":"VANRAJBHAI MAKVANA","Vehicle No":"GJ36V9074","GVW (In Kg.)":1820,"Registration Date":"09/06/25","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL),
  ('999c66bb-692c-4752-8d11-bbae688a59f5', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', 'KAMLESHBHAI PARMAR', NULL, '9537603249', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:23.856Z'::timestamptz, 'GJ36W3086', '2026-06-05T00:00:00.000Z'::timestamptz, '2025-06-06T00:00:00.000Z'::timestamptz, '804', 'BELA RANGPAR,MORBI,,363641', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"BELA RANGPAR,MORBI,,363641","Contact":"9537603249","Column_8":"NA","Owner Name":"KAMLESHBHAI PARMAR","Vehicle No":"GJ36W3086","GVW (In Kg.)":804,"Registration Date":"06/06/25","Insurance Validity":"05/06/26"}'::jsonb, NULL, NULL),
  ('91a6ce20-3d34-4dc7-a531-0459d21c9bb6', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', 'MAVJIBHAI RATHOD', NULL, 'NA', 'Assigned', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T08:42:23.856Z'::timestamptz, 'GJ36W3103', '2026-06-06T00:00:00.000Z'::timestamptz, '2025-06-07T00:00:00.000Z'::timestamptz, '804', 'PANELI,MORBI,,363642', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"PANELI,MORBI,,363642","Contact":"NA","Column_8":"NA","Owner Name":"MAVJIBHAI RATHOD","Vehicle No":"GJ36W3103","GVW (In Kg.)":804,"Registration Date":"07/06/25","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL),
  ('da1a691c-3402-4b5d-9790-1af44b19fcb9', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'MAKAVANA JAYDIPKUMAR', NULL, '8238767272', 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-09-12T10:43:04.860Z'::timestamptz, 'GJ11TT7697', '2026-06-06T00:00:00.000Z'::timestamptz, '2014-06-19T00:00:00.000Z'::timestamptz, '35000', 'NAVA PLOT VISTAR,AT BHANDURI,TAL MALIYA,362245', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"NAVA PLOT VISTAR,AT BHANDURI,TAL MALIYA,362245","Contact":"8238767272","Column_8":9898243121,"Owner Name":"MAKAVANA JAYDIPKUMAR","Vehicle No":"GJ11TT7697","GVW (In Kg.)":35000,"Registration Date":"19/06/14","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL),
  ('e4b4148c-bd77-434b-82d9-af34df1d95fc', '3c1e8734-ac95-4790-90c5-74d9479b1322', 'GOKALBHAI KHATANA', NULL, '9316137535', 'In Progress', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-27T09:01:31.505Z'::timestamptz, 'GJ03BY3611', '2026-06-06T00:00:00.000Z'::timestamptz, '2022-06-08T00:00:00.000Z'::timestamptz, '4995', 'PITRU PREM RESIDENCY,,AT. MALIYASAN,,TAL. RAJKOT, DIST. RAJKOT,360003', NULL, NULL, NULL, 'Demo leads 1', '{"Address":"PITRU PREM RESIDENCY,,AT. MALIYASAN,,TAL. RAJKOT, DIST. RAJKOT,360003","Contact":"9316137535","Column_8":"Agent Number","Owner Name":"GOKALBHAI KHATANA","Vehicle No":"GJ03BY3611","GVW (In Kg.)":4995,"policySubmission":{"status":"Documents_Approved","history":[{"by":"Sales 1","notes":"Submitted policy document bundle to manager (Manager 2) for review","action":"SUBMITTED","userId":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","timestamp":"2026-08-27T08:58:28.666Z"},{"by":"Manager 2","notes":"Approved by Manager on mobile app","action":"DOCUMENTS_APPROVED","userId":"37a211dd-6829-4b97-99e7-7fee3f5d9818","timestamp":"2026-08-27T09:01:28.733Z"},{"by":"Manager 2","notes":"Approved by Manager on mobile app","action":"DOCUMENTS_APPROVED","userId":"37a211dd-6829-4b97-99e7-7fee3f5d9818","timestamp":"2026-08-27T09:01:31.504Z"}],"formData":{},"documents":[{"id":"doc_1787821012461","category":"NCB_CONFIRMATION_SS","fileName":"IMG-20260827-WA0023.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/ncb_confirmation_ss_1787821011852_0vmo9.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:56:53.943Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/ncb_confirmation_ss_1787821011852_0vmo9.jpg","categoryLabel":"NCB Confirmation Screenshot","savedFileName":"ncb_confirmation_ss_1787821011852_0vmo9.jpg"},{"id":"doc_1787821018268","category":"PAN_CARD","fileName":"IMG-20260827-WA0018.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/pan_card_1787821017598_i2n5z.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:56:59.675Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/pan_card_1787821017598_i2n5z.jpg","categoryLabel":"Pan Card","savedFileName":"pan_card_1787821017598_i2n5z.jpg"},{"id":"doc_1787821043310","category":"PREVIOUS_POLICY","fileName":"182299.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/previous_policy_1787821042849_x8atq.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:57:27.859Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/previous_policy_1787821042849_x8atq.jpg","categoryLabel":"Previous Policy (If applicable)","savedFileName":"previous_policy_1787821042849_x8atq.jpg"},{"id":"doc_1787821051205","category":"QUOTATION","fileName":"181775.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/quotation_1787821050695_zli6h.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:57:32.822Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/quotation_1787821050695_zli6h.jpg","categoryLabel":"Quotation","savedFileName":"quotation_1787821050695_zli6h.jpg"},{"id":"doc_1787821062988","category":"RC_BOOK","fileName":"182888.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/rc_book_1787821062543_bkxav.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:57:47.305Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/rc_book_1787821062543_bkxav.jpg","categoryLabel":"RC book","savedFileName":"rc_book_1787821062543_bkxav.jpg"},{"id":"doc_1787821069088","category":"VEHICLE_PHOTO","fileName":"181685.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/vehicle_photo_1787821068613_uwclt.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:57:50.491Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/vehicle_photo_1787821068613_uwclt.jpg","categoryLabel":"Vehicle Photo for body type","savedFileName":"vehicle_photo_1787821068613_uwclt.jpg"},{"id":"doc_1787821082021","category":"IMP_DATE_SS","fileName":"182878.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/imp_date_ss_1787821081297_i0cba.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-27T08:58:06.674Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/imp_date_ss_1787821081297_i0cba.jpg","categoryLabel":"IMP date Message Screenshot","savedFileName":"imp_date_ss_1787821081297_i0cba.jpg"}],"managerId":"37a211dd-6829-4b97-99e7-7fee3f5d9818","updatedAt":"2026-08-27T09:01:31.504Z","reviewedAt":"2026-08-27T09:01:31.504Z","reviewedBy":"37a211dd-6829-4b97-99e7-7fee3f5d9818","managerName":"Manager 2","submittedAt":"2026-08-27T08:58:28.666Z","revertReason":null,"salesPersonId":"3c1e8734-ac95-4790-90c5-74d9479b1322","compiledPdfUrl":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/e4b4148c-bd77-434b-82d9-af34df1d95fc/compiled_single_policy_1787821099581.pdf","reviewedByName":"Manager 2","salesPersonName":"Sales 3","documentsApprovedAt":"2026-08-27T09:01:31.504Z","visibleToSalesPerson":true},"Registration Date":"08/06/22","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL),
  ('d028ef37-3af1-4bf6-b9bd-67907c60c535', NULL, 'HAJIBHAI MATHAKIYA', NULL, '9601854452', 'In Progress', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-20T09:20:59.221Z'::timestamptz, 'GJ03BT3108', '2026-06-07T00:00:00.000Z'::timestamptz, '2015-06-16T00:00:00.000Z'::timestamptz, '2450', 'NAVO BLOCK AT MAHIKA,TAL WANKANER,DIST RAJKOT,363621', NULL, 'Agent', NULL, 'Demo leads 1', '{"Address":"NAVO BLOCK AT MAHIKA,TAL WANKANER,DIST RAJKOT,363621","Contact":"9601854452","Column_8":9601854452,"Owner Name":"HAJIBHAI MATHAKIYA","Vehicle No":"GJ03BT3108","GVW (In Kg.)":2450,"policySubmission":{"status":"Documents_Approved","history":[{"by":"Sales 1","notes":"Submitted policy document bundle to manager (Manager 1) for review","action":"SUBMITTED","userId":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","timestamp":"2026-08-20T08:48:54.494Z"},{"by":"Admin","notes":"All 7 verified documents approved by manager. Ready for insurance company issuance.","action":"DOCUMENTS_APPROVED","userId":"8e65083f-6c19-478b-93a4-b8ba4fa16ddf","timestamp":"2026-08-20T09:20:07.845Z"}],"formData":{},"documents":[{"id":"doc_1787215554548","category":"IMP_DATE_SS","fileName":"1000481665.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/imp_date_ss_1787215552551_u1k14.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:46:00.079Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/imp_date_ss_1787215552551_u1k14.jpg","categoryLabel":"IMP date Message Screenshot","savedFileName":"imp_date_ss_1787215552551_u1k14.jpg"},{"id":"doc_1787215571617","category":"IMP_DATE_SS","fileName":"1000481665.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/imp_date_ss_1787215569496_se73r.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:46:17.184Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/imp_date_ss_1787215569496_se73r.jpg","categoryLabel":"IMP date Message Screenshot","savedFileName":"imp_date_ss_1787215569496_se73r.jpg"},{"id":"doc_1787215581342","category":"NCB_CONFIRMATION_SS","fileName":"1000481662.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/ncb_confirmation_ss_1787215580246_0o63i.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:46:23.313Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/ncb_confirmation_ss_1787215580246_0o63i.jpg","categoryLabel":"NCB Confirmation Screenshot","savedFileName":"ncb_confirmation_ss_1787215580246_0o63i.jpg"},{"id":"doc_1787215609422","category":"PREVIOUS_POLICY","fileName":"signature jiya patel .pdf","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/previous_policy_1787215608963_cnd3z.pdf","fileSize":0,"fileType":"application/pdf","uploadedAt":"2026-08-20T08:46:54.436Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/previous_policy_1787215608963_cnd3z.pdf","categoryLabel":"Previous Policy (If applicable)","savedFileName":"previous_policy_1787215608963_cnd3z.pdf"},{"id":"doc_1787215638128","category":"VEHICLE_PHOTO","fileName":"1000441457.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/vehicle_photo_1787215637302_2ir57.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:47:20.131Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/vehicle_photo_1787215637302_2ir57.jpg","categoryLabel":"Vehicle Photo for body type","savedFileName":"vehicle_photo_1787215637302_2ir57.jpg"},{"id":"doc_1787215653323","category":"PAN_CARD","fileName":"1000450287.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/pan_card_1787215652419_5kln5.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:47:38.373Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/pan_card_1787215652419_5kln5.jpg","categoryLabel":"Pan Card","savedFileName":"pan_card_1787215652419_5kln5.jpg"},{"id":"doc_1787215630471","category":"QUOTATION","fileName":"1000438606.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/quotation_1787215629328_cg59e.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:47:15.481Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/quotation_1787215629328_cg59e.jpg","categoryLabel":"Quotation","savedFileName":"quotation_1787215629328_cg59e.jpg"},{"id":"doc_1787215674340","category":"QUOTATION","fileName":"signature jiya patel .pdf","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/quotation_1787215673714_csg8j.pdf","fileSize":0,"fileType":"application/pdf","uploadedAt":"2026-08-20T08:47:59.850Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/quotation_1787215673714_csg8j.pdf","categoryLabel":"Quotation","savedFileName":"quotation_1787215673714_csg8j.pdf"},{"id":"doc_1787215698486","category":"RC_BOOK","fileName":"fd9915fa-8458-4502-9721-7968dd39bca7-1_all_24819.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/rc_book_1787215698023_kd565.jpg","fileSize":0,"fileType":"image/jpeg","uploadedAt":"2026-08-20T08:48:23.514Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/rc_book_1787215698023_kd565.jpg","categoryLabel":"RC book","savedFileName":"rc_book_1787215698023_kd565.jpg"}],"managerId":"2b56ea7e-5cb0-4059-878d-6cc2b628c543","updatedAt":"2026-08-20T09:20:07.845Z","reviewedAt":"2026-08-20T09:20:07.845Z","reviewedBy":"8e65083f-6c19-478b-93a4-b8ba4fa16ddf","managerName":"Manager 1","submittedAt":"2026-08-20T08:48:54.494Z","revertReason":null,"salesPersonId":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","compiledPdfUrl":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/d028ef37-3af1-4bf6-b9bd-67907c60c535/compiled_single_policy_1787215719802.pdf","reviewedByName":"Admin","salesPersonName":"Sales 1","documentsApprovedAt":"2026-08-20T09:20:07.845Z","visibleToSalesPerson":true},"Registration Date":"16/06/15","Insurance Validity":"07/06/26"}'::jsonb, NULL, NULL),
  ('311ec996-4120-4afc-89d8-741eab33611a', NULL, 'KRISHNA TRADERS', NULL, '9879009390', 'Won', '2026-08-20T07:49:00.229Z'::timestamptz, '2026-08-27T08:51:17.374Z'::timestamptz, 'GJ36S1035', '2027-08-20T11:01:51.991Z'::timestamptz, '2018-06-12T00:00:00.000Z'::timestamptz, '3290', 'SURVEY NO 65 3 OPP GWSS BOARD,WATER WORK KHEVARIYA ROAD,VILL BARVALA TAL MORBI,363641', NULL, 'Agent', NULL, 'Demo leads 1', '{"Address":"SURVEY NO 65 3 OPP GWSS BOARD,WATER WORK KHEVARIYA ROAD,VILL BARVALA TAL MORBI,363641","Contact":9879009390,"Column_8":9879009390,"Owner Name":"KRISHNA TRADERS","Vehicle No":"GJ36S1035","GVW (In Kg.)":3290,"policySubmission":{"status":"Policy_Issued","history":[{"by":"Sales 1","notes":"Submitted policy document bundle to manager (Manager 1) for review","action":"SUBMITTED","userId":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","timestamp":"2026-08-20T09:45:12.118Z"},{"by":"Manager 1","notes":"Approved by Manager in Policy Approvals","action":"DOCUMENTS_APPROVED","userId":"2b56ea7e-5cb0-4059-878d-6cc2b628c543","timestamp":"2026-08-20T11:01:16.097Z"},{"by":"Manager 1","notes":"Issued policy PDF uploaded by Manager. Policy #01 is now live.","action":"POLICY_ISSUED_UPLOADED","userId":"2b56ea7e-5cb0-4059-878d-6cc2b628c543","timestamp":"2026-08-20T11:01:57.701Z"}],"formData":{"ncb":"with ncb","rate":"abc","regNo":"GJ36S1035","expDate":"2027-08-20","newName":"abc","provider":"Go Digit","hpDetails":"as per rc","mobileNo1":"9879009390","mobileNo2":"abc","idvBreakup":"abc","otherWorks":"abcabc","paidAmount":0,"policyType":"FULL","description":"abc","paymentMode":"cash","customerType":"existing","impDateMsgSS":"Yes","policyNumber":"01","totalPremium":0,"vehiclePhoto":"n.a.","pendingAmount":0,"rsFromCustomer":"abc","bodyTypeMatched":"n.a.","ncbConfirmation":"Yes","customerCategory":"MVC","inspectionStatus":"Not Required","amountDueDateMsgSS":"abc","mparivahanRcStatus":"abc","rateConfirmationSS":"YES","googleFormSubmitted":"YES","noJackCoverConfirmationSS":"N.A."},"issuedAt":"2026-08-20T11:01:57.701Z","policyId":"3801ec87-aa4b-415c-8598-1e4442e1063f","documents":[{"id":"doc_1787219013779","category":"IMP_DATE_SS","fileName":"WhatsApp Image 2026-08-19 at 11.50.03 AM (2).jpeg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/imp_date_ss_1787219012950_WhatsApp_Image_2026-08-19_at_11_50_03_AM__2_.jpeg","fileSize":115417,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:43:35.781Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/imp_date_ss_1787219012950_WhatsApp_Image_2026-08-19_at_11_50_03_AM__2_.jpeg","categoryLabel":"1. IMP Date Message Screenshot","savedFileName":"imp_date_ss_1787219012950_WhatsApp_Image_2026-08-19_at_11_50_03_AM__2_.jpeg"},{"id":"doc_1787219017506","category":"NCB_CONFIRMATION_SS","fileName":"WhatsApp Image 2026-08-19 at 11.50.02 AM.jpeg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/ncb_confirmation_ss_1787219017055_WhatsApp_Image_2026-08-19_at_11_50_02_AM.jpeg","fileSize":161427,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:43:39.489Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/ncb_confirmation_ss_1787219017055_WhatsApp_Image_2026-08-19_at_11_50_02_AM.jpeg","categoryLabel":"2. NCB Confirmation Screenshot","savedFileName":"ncb_confirmation_ss_1787219017055_WhatsApp_Image_2026-08-19_at_11_50_02_AM.jpeg"},{"id":"doc_1787219023166","category":"PREVIOUS_POLICY","fileName":"WhatsApp Image 2026-08-19 at 11.50.03 AM (1).jpeg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/previous_policy_1787219022793_WhatsApp_Image_2026-08-19_at_11_50_03_AM__1_.jpeg","fileSize":154054,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:43:45.039Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/previous_policy_1787219022793_WhatsApp_Image_2026-08-19_at_11_50_03_AM__1_.jpeg","categoryLabel":"4. Previous Policy (If applicable)","savedFileName":"previous_policy_1787219022793_WhatsApp_Image_2026-08-19_at_11_50_03_AM__1_.jpeg"},{"id":"doc_1787219027623","category":"PAN_CARD","fileName":"WhatsApp Image 2026-08-19 at 11.50.03 AM (3).jpeg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/pan_card_1787219027142_WhatsApp_Image_2026-08-19_at_11_50_03_AM__3_.jpeg","fileSize":115417,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:43:53.121Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/pan_card_1787219027142_WhatsApp_Image_2026-08-19_at_11_50_03_AM__3_.jpeg","categoryLabel":"3. Pan Card","savedFileName":"pan_card_1787219027142_WhatsApp_Image_2026-08-19_at_11_50_03_AM__3_.jpeg"},{"id":"doc_1787219034750","category":"RC_BOOK","fileName":"signature.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/rc_book_1787219034340_signature.jpg","fileSize":21196,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:43:56.553Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/rc_book_1787219034340_signature.jpg","categoryLabel":"6. RC Book","savedFileName":"rc_book_1787219034340_signature.jpg"},{"id":"doc_1787219040439","category":"VEHICLE_PHOTO","fileName":"Jiya Patel_20260608_074424_0000.png_page-0001.jpg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/vehicle_photo_1787219039494_Jiya_Patel_20260608_074424_0000_png_page-0001.jpg","fileSize":768699,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:44:02.325Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/vehicle_photo_1787219039494_Jiya_Patel_20260608_074424_0000_png_page-0001.jpg","categoryLabel":"7. Vehicle Photo for Body Type","savedFileName":"vehicle_photo_1787219039494_Jiya_Patel_20260608_074424_0000_png_page-0001.jpg"},{"id":"doc_1787219048386","category":"QUOTATION","fileName":".jpeg","filePath":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/quotation_1787219048000_.jpeg","fileSize":124271,"fileType":"image/jpeg","uploadedAt":"2026-08-20T09:44:10.243Z","uploadedBy":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","storagePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/quotation_1787219048000_.jpeg","categoryLabel":"5. Quotation","savedFileName":"quotation_1787219048000_.jpeg"}],"managerId":"2b56ea7e-5cb0-4059-878d-6cc2b628c543","updatedAt":"2026-08-20T11:01:57.701Z","compiledAt":"2026-08-20T09:44:59.206Z","reviewedAt":"2026-08-20T11:01:16.097Z","reviewedBy":"2b56ea7e-5cb0-4059-878d-6cc2b628c543","managerName":"Manager 1","submittedAt":"2026-08-20T09:45:12.118Z","policyNumber":"01","revertReason":null,"salesPersonId":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","compiledPdfUrl":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/policy_bundle_311ec996-4120-4afc-89d8-741eab33611a_1787219097013.pdf","reviewedByName":"Manager 1","salesPersonName":"Sales 1","issuedPolicyPdfUrl":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/issued_company_policy_1787223711332.pdf","compiledStoragePath":"lead-documents/311ec996-4120-4afc-89d8-741eab33611a/policy_bundle_311ec996-4120-4afc-89d8-741eab33611a_1787219097013.pdf","documentsApprovedAt":"2026-08-20T11:01:16.097Z","visibleToSalesPerson":true},"Registration Date":"12/06/18","Insurance Validity":"06/06/26"}'::jsonb, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Table "public"."customers": 0 rows
-- Table "public"."policies": 1 rows
INSERT INTO "public"."policies" ("id", "leadId", "policyNumber", "provider", "type", "premiumAmount", "status", "startDate", "endDate", "createdAt", "updatedAt")
VALUES
  ('3801ec87-aa4b-415c-8598-1e4442e1063f', '311ec996-4120-4afc-89d8-741eab33611a', '01', 'Go Digit', 'FULL', 0, 'Active', '2026-08-20T11:01:51.991Z'::timestamptz, '2027-08-20T11:01:51.991Z'::timestamptz, '2026-08-20T11:01:54.882Z'::timestamptz, '2026-08-20T11:01:54.882Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."quotations": 0 rows
-- Table "public"."calls": 2 rows
INSERT INTO "public"."calls" ("id", "leadId", "userId", "type", "outcome", "duration", "notes", "createdAt")
VALUES
  ('5c411892-ef72-4b63-897d-36f11d38cd2b', 'da1a691c-3402-4b5d-9790-1af44b19fcb9', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'outbound', 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો', NULL, 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો
Abc', '2026-09-12T10:42:39.921Z'::timestamptz),
  ('1b49e622-28a9-48b0-a435-fd4567e116b1', 'da1a691c-3402-4b5d-9790-1af44b19fcb9', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'outbound', 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.', NULL, 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.
Gfgh', '2026-09-12T10:43:05.651Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."follow_ups": 0 rows
-- Table "public"."claims": 0 rows
-- Table "public"."transactions": 0 rows
-- Table "public"."loans": 0 rows
-- Table "public"."rto_work": 0 rows
-- Table "public"."fitness_work": 0 rows
-- Table "public"."activity_logs": 1 rows
INSERT INTO "public"."activity_logs" ("id", "userId", "action", "entityType", "entityId", "metadata", "createdAt")
VALUES
  ('4e07c09e-e51b-4dfa-9618-5b60724e378c', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'change_approved', 'Lead', 'adceecae-7fb1-4580-92aa-28666d7d9b7d', '{"field":"existingAgent","newValue":"Agent"}'::jsonb, '2026-08-20T09:21:31.958Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."documents": 12 rows
INSERT INTO "public"."documents" ("id", "entityType", "entityId", "fileName", "filePath", "uploadedBy", "createdAt")
VALUES
  ('374cf5e9-3139-4b09-af18-7f219ac2176a', 'User', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'ADHAR', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199035671-adhar.jpg', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:44:16.917Z'::timestamptz),
  ('d196e7ce-da88-44c0-96fd-a8f8cc1e1c56', 'User', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'PAN', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199038107-pan.jpg', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:44:16.917Z'::timestamptz),
  ('29c52700-e7a6-48e2-909f-8310e159c3ea', 'User', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'SSC', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199040727-ssc.jpg', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:44:16.917Z'::timestamptz),
  ('d7898631-8455-455a-9927-f708bd5894f8', 'User', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'QUALIFICATION', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199043475-qualification.jpg', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:44:16.917Z'::timestamptz),
  ('07546c9e-162d-452b-8555-88d9fc6f1953', 'User', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'LEAVING', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199045943-leaving.jpg', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:44:16.917Z'::timestamptz),
  ('20ad0ff1-b454-41a1-ae74-6a8feb2adc7c', 'User', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'PHOTO', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199050020-photo.jpeg', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:44:16.917Z'::timestamptz),
  ('3f709750-5f59-47ae-9f87-1efdeee3f92d', 'User', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'ADHAR', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199107260-adhar.png', 'c9141a42-f10f-414f-9fc7-aa736e921454', '2026-09-12T07:45:45.985Z'::timestamptz),
  ('d7c1db6f-bb92-4aa4-b9cc-7fbb663d58dd', 'User', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'PAN', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199118481-pan.jpg', 'c9141a42-f10f-414f-9fc7-aa736e921454', '2026-09-12T07:45:45.985Z'::timestamptz),
  ('25f86308-f416-4b44-9f24-b4e9d67bd505', 'User', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'SSC', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199125490-ssc.jpeg', 'c9141a42-f10f-414f-9fc7-aa736e921454', '2026-09-12T07:45:45.985Z'::timestamptz),
  ('5cecf947-ea60-4a0b-b393-c1a18c34e5c4', 'User', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'QUALIFICATION', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199130465-qualification.jpeg', 'c9141a42-f10f-414f-9fc7-aa736e921454', '2026-09-12T07:45:45.985Z'::timestamptz),
  ('d6cf27cb-6d10-4c4b-94d1-0075f75854ac', 'User', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'LEAVING', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199134728-leaving.jpeg', 'c9141a42-f10f-414f-9fc7-aa736e921454', '2026-09-12T07:45:45.985Z'::timestamptz),
  ('e2ab6a66-9720-4638-8758-9d7adab2636b', 'User', 'c9141a42-f10f-414f-9fc7-aa736e921454', 'PHOTO', 'https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/onboarding/1789199138910-photo.jpeg', 'c9141a42-f10f-414f-9fc7-aa736e921454', '2026-09-12T07:45:45.985Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."visits": 0 rows
-- Table "public"."notifications": 14 rows
INSERT INTO "public"."notifications" ("id", "userId", "title", "body", "type", "entityType", "entityId", "isRead", "readAt", "data", "createdAt")
VALUES
  ('5baa711e-3353-4eb7-9261-3050ba97193b', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', '📋 3 New Leads Assigned — June 2026', 'You have been assigned 3 leads for June 2026. Check your leads section.', 'info', 'lead_assignment', NULL, FALSE, NULL, '{"year":2026,"count":3,"month":6}'::jsonb, '2026-08-20T08:42:30.553Z'::timestamptz),
  ('c789e2e2-b0e1-4231-a9cc-e98f50859f0e', '3c1e8734-ac95-4790-90c5-74d9479b1322', '📋 3 New Leads Assigned — June 2026', 'You have been assigned 3 leads for June 2026. Check your leads section.', 'info', 'lead_assignment', NULL, FALSE, NULL, '{"year":2026,"count":3,"month":6}'::jsonb, '2026-08-20T08:42:31.482Z'::timestamptz),
  ('fea506ea-6938-4c53-972c-fc7ece3d6048', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', '📋 3 New Leads Assigned — June 2026', 'You have been assigned 3 leads for June 2026. Check your leads section.', 'info', 'lead_assignment', NULL, FALSE, NULL, '{"year":2026,"count":3,"month":6}'::jsonb, '2026-08-20T08:42:32.411Z'::timestamptz),
  ('4437b54f-8404-47f2-aab6-d7ae9fc0ab02', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '📋 4 New Leads Assigned — June 2026', 'You have been assigned 4 leads for June 2026. Check your leads section.', 'info', 'lead_assignment', NULL, TRUE, '2026-08-20T08:43:59.664Z'::timestamptz, '{"year":2026,"count":4,"month":6}'::jsonb, '2026-08-20T08:42:29.624Z'::timestamptz),
  ('dc794922-4ef4-4ec7-af48-26a947b84ab7', '2b56ea7e-5cb0-4059-878d-6cc2b628c543', '📋 New Policy Submission: HAJIBHAI MATHAKIYA', 'Sales 1 submitted policy docs for GJ03BT3108. Review consolidated PDF & details.', 'policy_submission', 'lead', 'd028ef37-3af1-4bf6-b9bd-67907c60c535', FALSE, NULL, '{"leadId":"d028ef37-3af1-4bf6-b9bd-67907c60c535","vehicleNo":"GJ03BT3108","clientName":"HAJIBHAI MATHAKIYA","compiledPdfUrl":null,"salesPersonName":"Sales 1"}'::jsonb, '2026-08-20T08:48:55.430Z'::timestamptz),
  ('65ef603e-2bd8-4117-ae02-7e6af03efafb', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '✅ Documents Approved: HAJIBHAI MATHAKIYA', 'Manager Admin approved the document bundle for GJ03BT3108. It is now sent for external policy issuance.', 'policy_approved', 'lead', 'd028ef37-3af1-4bf6-b9bd-67907c60c535', FALSE, NULL, '{"leadId":"d028ef37-3af1-4bf6-b9bd-67907c60c535","vehicleNo":"GJ03BT3108","clientName":"HAJIBHAI MATHAKIYA","managerName":"Admin"}'::jsonb, '2026-08-20T09:20:08.939Z'::timestamptz),
  ('49129363-508d-4f20-b348-919eb480fc80', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', '📋 June 2026 Leads Assigned', '13 leads assigned via round-robin. Sales 1: 4 leads, Sales 2: 3 leads, Sales 3: 3 leads, Sales 4: 3 leads', 'info', 'lead_assignment', NULL, TRUE, '2026-08-20T09:21:05.428Z'::timestamptz, '{"year":2026,"month":6,"importName":"all","distribution":[{"id":"8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d","name":"Sales 1","leadsAssigned":4},{"id":"5e6a8c0e-a60c-4741-b280-f7cac79e029c","name":"Sales 2","leadsAssigned":3},{"id":"3c1e8734-ac95-4790-90c5-74d9479b1322","name":"Sales 3","leadsAssigned":3},{"id":"57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b","name":"Sales 4","leadsAssigned":3}],"totalAssigned":13}'::jsonb, '2026-08-20T08:42:27.578Z'::timestamptz),
  ('a57c035b-45be-4d1b-9b01-51c964fed1d7', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', '✅ Change Approved', 'Your request to change "existingAgent" has been approved.', 'success', 'DataChangeRequest', '0ded2733-2db6-44cd-ba45-50d84b678946', TRUE, '2026-08-20T09:31:34.044Z'::timestamptz, NULL, '2026-08-20T09:21:31.958Z'::timestamptz),
  ('6f966bff-18db-4139-88f9-8e8429ff4fb4', '2b56ea7e-5cb0-4059-878d-6cc2b628c543', '📋 New Policy Submission: KRISHNA TRADERS', 'Sales 1 submitted policy docs for GJ36S1035. Review consolidated PDF & details.', 'policy_submission', 'lead', '311ec996-4120-4afc-89d8-741eab33611a', FALSE, NULL, '{"leadId":"311ec996-4120-4afc-89d8-741eab33611a","vehicleNo":"GJ36S1035","clientName":"KRISHNA TRADERS","compiledPdfUrl":"https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/policy_bundle_311ec996-4120-4afc-89d8-741eab33611a_1787219097013.pdf","salesPersonName":"Sales 1"}'::jsonb, '2026-08-20T09:45:13.047Z'::timestamptz),
  ('3c72c362-9505-4b2d-8353-9169de47025b', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '✅ Documents Approved: KRISHNA TRADERS', 'Manager Manager 1 approved the document bundle for GJ36S1035. It is now sent for external policy issuance.', 'policy_approved', 'lead', '311ec996-4120-4afc-89d8-741eab33611a', FALSE, NULL, '{"leadId":"311ec996-4120-4afc-89d8-741eab33611a","vehicleNo":"GJ36S1035","clientName":"KRISHNA TRADERS","managerName":"Manager 1"}'::jsonb, '2026-08-20T11:01:17.058Z'::timestamptz),
  ('f78ccf65-e1b8-44a3-8d61-c282ca24a57b', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '🎉 Policy Issued: KRISHNA TRADERS', 'Official policy 01 (Go Digit) has been uploaded and is active. 1-year renewal tracking enabled.', 'policy_issued', 'lead', '311ec996-4120-4afc-89d8-741eab33611a', FALSE, NULL, NULL, '2026-08-20T11:02:03.597Z'::timestamptz),
  ('4d799fbd-ac59-4c2a-8c7e-78c52eae5323', '37a211dd-6829-4b97-99e7-7fee3f5d9818', '📋 New Policy Submission: GOKALBHAI KHATANA', 'Sales 3 submitted policy docs for GJ03BY3611. Review consolidated PDF & details.', 'policy_submission', 'lead', 'e4b4148c-bd77-434b-82d9-af34df1d95fc', FALSE, NULL, '{"leadId":"e4b4148c-bd77-434b-82d9-af34df1d95fc","vehicleNo":"GJ03BY3611","clientName":"GOKALBHAI KHATANA","compiledPdfUrl":null,"salesPersonName":"Sales 3"}'::jsonb, '2026-08-27T08:58:29.621Z'::timestamptz),
  ('e6e0a38d-4feb-48d6-b29e-699371d2535c', '3c1e8734-ac95-4790-90c5-74d9479b1322', '✅ Documents Approved: GOKALBHAI KHATANA', 'Manager Manager 2 approved the document bundle for GJ03BY3611. It is now sent for external policy issuance.', 'policy_approved', 'lead', 'e4b4148c-bd77-434b-82d9-af34df1d95fc', FALSE, NULL, '{"leadId":"e4b4148c-bd77-434b-82d9-af34df1d95fc","vehicleNo":"GJ03BY3611","clientName":"GOKALBHAI KHATANA","managerName":"Manager 2"}'::jsonb, '2026-08-27T09:01:29.676Z'::timestamptz),
  ('976a7dd6-ca0c-4cce-a0dd-a79059b64085', '3c1e8734-ac95-4790-90c5-74d9479b1322', '✅ Documents Approved: GOKALBHAI KHATANA', 'Manager Manager 2 approved the document bundle for GJ03BY3611. It is now sent for external policy issuance.', 'policy_approved', 'lead', 'e4b4148c-bd77-434b-82d9-af34df1d95fc', FALSE, NULL, '{"leadId":"e4b4148c-bd77-434b-82d9-af34df1d95fc","vehicleNo":"GJ03BY3611","clientName":"GOKALBHAI KHATANA","managerName":"Manager 2"}'::jsonb, '2026-08-27T09:01:32.449Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."data_change_requests": 11 rows
INSERT INTO "public"."data_change_requests" ("id", "requestedBy", "reviewedBy", "entityType", "entityId", "field", "oldValue", "newValue", "reason", "status", "reviewNote", "requestedAt", "reviewedAt")
VALUES
  ('9f47345a-6584-4197-a3b8-30de02e347f5', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'Lead', '485dd171-d5f0-45a7-947c-3c7a6a1c5000', 'existingAgent', 'Unassigned', 'Agent', 'Detected Agent in import "sample leads 2" (Contact: 9879596374)', 'approved', NULL, '2026-08-19T10:07:15.988Z'::timestamptz, '2026-08-19T10:08:14.798Z'::timestamptz),
  ('612b414a-cdda-44c8-9738-6026fdeea496', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'Lead', 'd3f8e75a-e69d-4be8-9aeb-d1d732313e08', 'existingAgent', 'Regular', 'Agent', 'Staff requested to mark as Agent', 'rejected', NULL, '2026-08-19T06:16:27.085Z'::timestamptz, '2026-08-19T10:08:41.740Z'::timestamptz),
  ('3d8749f9-b317-479b-86fe-9267196343fb', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'Lead', '04f88c3e-67d8-42b0-94ca-d543df36d484', 'existingAgent', 'Regular', 'Agent', 'Staff requested to mark as Agent', 'rejected', NULL, '2026-08-19T06:13:42.588Z'::timestamptz, '2026-08-19T10:09:03.005Z'::timestamptz),
  ('ee801832-ce33-44df-88a7-28b9a3fff75d', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', NULL, 'Lead', 'b00d0bec-5e38-44b1-9a43-3b459cbc50a4', 'existingAgent', 'Regular', 'Agent', 'Staff requested to mark as Agent', 'pending', NULL, '2026-08-19T15:20:29.669Z'::timestamptz, NULL),
  ('976afbfa-2722-4ae3-be2c-55d114d8bc7d', '2b56ea7e-5cb0-4059-878d-6cc2b628c543', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'Lead', '52ffc61a-c320-4093-af0b-eb96fd3914a6', 'existingAgent', 'Regular', 'Agent', 'Staff requested to mark as Agent', 'approved', NULL, '2026-08-19T15:24:09.186Z'::timestamptz, '2026-08-19T15:25:00.342Z'::timestamptz),
  ('b7fc58e1-a2a0-4572-a6a3-a55eb2eae4db', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', NULL, 'Lead', 'b51f7fdb-4e3e-4f85-897a-21753868a11e', 'existingAgent', 'Regular', 'Agent', 'Staff requested to mark as Agent', 'pending', NULL, '2026-08-19T17:16:11.980Z'::timestamptz, NULL),
  ('f91578c9-5451-4c64-b32b-f81b4d6106d5', '2b56ea7e-5cb0-4059-878d-6cc2b628c543', NULL, 'Lead', 'b7eabc3f-e3de-4015-a2a3-695860f9eed4', 'existingAgent', 'Regular', 'Agent', 'Staff requested to mark as Agent', 'pending', NULL, '2026-08-19T17:22:19.790Z'::timestamptz, NULL),
  ('5b1741db-29e6-4750-b5cd-67673f8d8d43', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', NULL, 'Lead', 'b08236ad-cbfd-4786-a1cf-1ac380fa0081', 'existingAgent', 'Unassigned', 'Agent', 'Detected Agent in import "Jiya testing" (Contact: 7096601117)', 'pending', NULL, '2026-08-19T17:38:56.584Z'::timestamptz, NULL),
  ('f1f157de-74f7-410b-b0be-01bd643e4218', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', NULL, 'Lead', 'e0310042-a2b8-43fe-a630-8ee23dfb6be4', 'existingAgent', 'Unassigned', 'Agent', 'Detected Agent in import "Jiya testing" (Contact: 9712710003)', 'pending', NULL, '2026-08-19T17:38:58.456Z'::timestamptz, NULL),
  ('172f4527-f34e-4a8a-b1b0-4a519097bfbd', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', NULL, 'Lead', '94d97638-218a-44a4-b920-bd5a41d3271b', 'existingAgent', 'Unassigned', 'Agent', 'Detected Agent in import "Jiya testing" (Contact: 9825460900)', 'pending', NULL, '2026-08-19T17:39:00.325Z'::timestamptz, NULL),
  ('0ded2733-2db6-44cd-ba45-50d84b678946', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', '8e65083f-6c19-478b-93a4-b8ba4fa16ddf', 'Lead', 'adceecae-7fb1-4580-92aa-28666d7d9b7d', 'existingAgent', 'Unassigned', 'Agent', 'Detected Agent in import "Jiya testing" (Contact: 9316137535)', 'approved', NULL, '2026-08-19T17:39:02.193Z'::timestamptz, '2026-08-20T09:21:29.939Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."lead_assignments": 14 rows
INSERT INTO "public"."lead_assignments" ("id", "leadId", "userId", "assignedAt")
VALUES
  ('bb2c406d-4e7a-4178-834b-354c32fc8bd0', '1fb2e641-8d3d-40da-821d-2362827ccbcc', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('04388379-08f3-4157-b382-0c064ea9c30f', 'c144cfcc-72fe-4df0-ace7-eb6a5fe45e35', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('a30d44d9-db6c-4e18-9b7f-2302d86fcf11', 'd07dc9ba-af57-43e4-9531-4ec0b97f217b', '3c1e8734-ac95-4790-90c5-74d9479b1322', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('86074e64-f999-499f-90ac-d7501c3badc4', '999c66bb-692c-4752-8d11-bbae688a59f5', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('91a0a6b3-6871-441d-bf03-f111ae2e7c38', 'e8b8d485-f8c2-4754-9371-0e96cd6601bf', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('22218dea-f17b-4827-86e1-8f502b816668', '30747d5e-45c7-49ce-9713-8852f8a75e4a', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('a464016a-1f3d-4291-9034-12906ba6169e', 'e4b4148c-bd77-434b-82d9-af34df1d95fc', '3c1e8734-ac95-4790-90c5-74d9479b1322', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('79ec5735-8e56-44b6-80a0-b643641c4d97', 'da1a691c-3402-4b5d-9790-1af44b19fcb9', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('4ee2ef80-95df-4a90-9bc5-c9d9523589c8', '311ec996-4120-4afc-89d8-741eab33611a', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('e817743e-f4ad-42b4-beab-0d13559ce9a7', 'fde9b5bf-8ea6-4b0a-95c4-63fd4ff6abfa', '5e6a8c0e-a60c-4741-b280-f7cac79e029c', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('47a2e8d3-db26-4707-b7b3-307a28755bc3', 'b383a596-aacd-450e-8134-8508bc6aa282', '3c1e8734-ac95-4790-90c5-74d9479b1322', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('18c5436e-a3c4-485d-b2ca-bc70bb53d226', '91a6ce20-3d34-4dc7-a531-0459d21c9bb6', '57f7f211-2ccb-4edd-ae1d-ef5ab9d9b63b', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('f64faee4-b8bf-4826-82cf-5414e2deced4', 'd028ef37-3af1-4bf6-b9bd-67907c60c535', '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '2026-08-20T08:42:24.785Z'::timestamptz),
  ('e080df07-7895-480b-8cff-067b0258b6b0', 'da1a691c-3402-4b5d-9790-1af44b19fcb9', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', '2026-09-12T07:53:42.694Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."lead_whatsapp_logs": 0 rows
-- Table "public"."lead_status_history": 2 rows
INSERT INTO "public"."lead_status_history" ("id", "leadId", "userId", "oldStatus", "newStatus", "notes", "changedAt")
VALUES
  ('a4284899-af35-4c3c-bac5-b7a8c0319c16', 'da1a691c-3402-4b5d-9790-1af44b19fcb9', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'Assigned', 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો', 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો
Abc', '2026-09-12T10:42:39.542Z'::timestamptz),
  ('15eabc50-79f0-4026-ac76-6f1f71fb53d1', 'da1a691c-3402-4b5d-9790-1af44b19fcb9', '0b52f7a4-d2e7-40da-8ab2-3c81dd5be55a', 'TORQUE માં બીજા સ્ટાફ પાસે કરાવ્યો', 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.', 'સમયસર કોલ ના કર્યો એટલે બીજા પાસે કરાવી લીધો.
Gfgh', '2026-09-12T10:43:05.263Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- Table "public"."attendance": 0 rows
-- Table "public"."leave_requests": 0 rows
-- Table "public"."salaries": 0 rows
-- Table "public"."renewal_records": 1 rows
INSERT INTO "public"."renewal_records" ("id", "leadId", "policyId", "vehicleNo", "clientName", "clientPhone", "clientEmail", "policyNumber", "provider", "policyType", "premiumAmount", "policyStartDate", "policyEndDate", "documents", "customData", "assignedTo", "assignedMonth", "assignedYear", "renewalStatus", "renewedAt", "refusedAt", "createdBySalesId", "createdAt", "updatedAt")
VALUES
  ('12c82fef-8cda-4b36-92b7-956ecdb34882', '311ec996-4120-4afc-89d8-741eab33611a', '3801ec87-aa4b-415c-8598-1e4442e1063f', 'GJ36S1035', 'KRISHNA TRADERS', '9879009390', NULL, '01', 'Go Digit', 'FULL', 0, '2026-08-20T11:01:51.991Z'::timestamptz, '2027-08-20T11:01:51.991Z'::timestamptz, '["https://ugwklaxdyibldmgdadyc.supabase.co/storage/v1/object/public/documents/lead-documents/311ec996-4120-4afc-89d8-741eab33611a/issued_company_policy_1787223711332.pdf"]'::jsonb, NULL, NULL, NULL, NULL, 'Active', NULL, NULL, '8afa4b5b-0fc8-4434-9bb6-15f0aeb21b4d', '2026-08-20T11:01:56.761Z'::timestamptz, '2026-08-20T11:01:56.761Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- ─── STEP 5: SUPABASE STORAGE BUCKETS ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 6: AUTOMATION FUNCTIONS & TRIGGERS ─────────────────────────────

-- 1. Automatic profile creation on auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, "fullName", "isActive", "createdAt", "updatedAt")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Employee'),
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Automatic cleanup on auth user deletion
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users SET "managerId" = NULL WHERE "managerId" = old.id;
  UPDATE public.leads SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.claims SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.loans SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.rto_work SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.fitness_work SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
  UPDATE public.visits SET "userId" = NULL WHERE "userId" = old.id;
  UPDATE public.transactions SET "userId" = NULL WHERE "userId" = old.id;
  UPDATE public.quotations SET "createdBy" = NULL WHERE "createdBy" = old.id;
  UPDATE public.leave_requests SET "approvedBy" = NULL WHERE "approvedBy" = old.id;

  DELETE FROM public.notifications WHERE "userId" = old.id;
  DELETE FROM public.attendance WHERE "userId" = old.id;
  DELETE FROM public.salaries WHERE "userId" = old.id;
  DELETE FROM public.lead_assignments WHERE "userId" = old.id;
  DELETE FROM public.activity_logs WHERE "userId" = old.id;
  DELETE FROM public.lead_whatsapp_logs WHERE "userId" = old.id;
  DELETE FROM public.lead_status_history WHERE "userId" = old.id;
  DELETE FROM public.leave_requests WHERE "userId" = old.id;

  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- ─── STEP 7: ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────
-- ============================================================
-- Torque Auto Advisor — Row Level Security Policies (FIXED)
-- Run this in the Supabase SQL Editor after enabling RLS.
-- ============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- ─── USERS TABLE ────────────────────────────────────────────
-- Users can read their own profile
DROP POLICY IF EXISTS "users: self-read" ON users;
CREATE POLICY "users: self-read"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users with admin/manager role can read all users
DROP POLICY IF EXISTS "users: admins-read-all" ON users;
CREATE POLICY "users: admins-read-all"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager', 'HR Manager')
    )
  );

-- Only admins can insert/update/delete users
DROP POLICY IF EXISTS "users: admin-write" ON users;
CREATE POLICY "users: admin-write"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin')
    )
  );

-- ─── DOCUMENTS TABLE ────────────────────────────────────────
-- Uploader can always access their own documents
DROP POLICY IF EXISTS "documents: uploader-access" ON documents;
CREATE POLICY "documents: uploader-access"
  ON documents FOR SELECT
  USING ("uploadedBy" = auth.uid());

-- Admins can access all documents
DROP POLICY IF EXISTS "documents: admin-access" ON documents;
CREATE POLICY "documents: admin-access"
  ON documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin')
    )
  );

-- ─── LEADS TABLE ────────────────────────────────────────────
-- Agents see only their assigned leads
DROP POLICY IF EXISTS "leads: assigned-agent-read" ON leads;
CREATE POLICY "leads: assigned-agent-read"
  ON leads FOR SELECT
  USING ("assignedTo" = auth.uid());

-- Managers/Admins see all leads
DROP POLICY IF EXISTS "leads: admin-manager-read-all" ON leads;
CREATE POLICY "leads: admin-manager-read-all"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- Any authenticated user can create leads
DROP POLICY IF EXISTS "leads: authenticated-create" ON leads;
CREATE POLICY "leads: authenticated-create"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── ACTIVITY LOGS TABLE ────────────────────────────────────
-- Only admins can read all activity logs
DROP POLICY IF EXISTS "activity_logs: admin-read" ON activity_logs;
CREATE POLICY "activity_logs: admin-read"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- ─── TRANSACTIONS TABLE ─────────────────────────────────────
-- Users see their own transactions
DROP POLICY IF EXISTS "transactions: self-read" ON transactions;
CREATE POLICY "transactions: self-read"
  ON transactions FOR SELECT
  USING ("userId" = auth.uid());

-- Admins/Accountants see all
DROP POLICY IF EXISTS "transactions: finance-read-all" ON transactions;
CREATE POLICY "transactions: finance-read-all"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Accountant', 'Manager')
    )
  );

-- ─── QUOTATIONS TABLE ───────────────────────────────────────
-- Creators can see their own quotations
DROP POLICY IF EXISTS "quotations: creator-read" ON quotations;
CREATE POLICY "quotations: creator-read"
  ON quotations FOR SELECT
  USING ("createdBy" = auth.uid());

-- Managers/Admins see all
DROP POLICY IF EXISTS "quotations: admin-read-all" ON quotations;
CREATE POLICY "quotations: admin-read-all"
  ON quotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u."roleId" = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Admin', 'Manager')
    )
  );


-- ─── STEP 8: RE-ENABLE FOREIGN KEYS & TRIGGERS ─────────────────────────
SET session_replication_role = 'origin';

-- =========================================================================
-- MIGRATION COMPLETE!
-- =========================================================================
