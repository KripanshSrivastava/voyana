-- PostgreSQL drift fix for the current Lead Credit MVP schema.
-- Idempotent by design so it can be applied safely to environments that may
-- already have part of the schema.

ALTER TABLE "AgentPreference"
  ADD COLUMN IF NOT EXISTS "alertClientLocations" TEXT,
  ADD COLUMN IF NOT EXISTS "alertMaxBudget" INTEGER,
  ADD COLUMN IF NOT EXISTS "alertMaxLeadPrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "alertMinLeadPrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "alertTravelDateFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "alertTravelDateTo" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "alertTripTypes" TEXT,
  ADD COLUMN IF NOT EXISTS "autoBuyMaxBudget" INTEGER,
  ADD COLUMN IF NOT EXISTS "autoBuyMinBudget" INTEGER,
  ADD COLUMN IF NOT EXISTS "autoBuyTravelDateFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoBuyTravelDateTo" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoBuyTripTypes" TEXT;

ALTER TABLE "SpamReport"
  ADD COLUMN IF NOT EXISTS "leadAssignmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "refundAmount" INTEGER,
  ADD COLUMN IF NOT EXISTS "refundWalletTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AgentCreditBalance" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentCreditBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadCreditPackage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "priceInr" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadCreditPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadCreditPurchase" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "priceInr" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "provider" TEXT NOT NULL DEFAULT 'razorpay',
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadCreditPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadCreditLedger" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "creditAmount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "referenceId" TEXT,
  "packageId" TEXT,
  "leadAssignmentId" TEXT,
  "leadId" TEXT,
  "adminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadAssignmentStatusHistory" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "oldStatus" TEXT,
  "newStatus" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  CONSTRAINT "LeadAssignmentStatusHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WalletTopup"
  ADD COLUMN IF NOT EXISTS "leadCreditPurchaseId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AgentCreditBalance_agentId_key" ON "AgentCreditBalance"("agentId");
CREATE INDEX IF NOT EXISTS "LeadCreditPackage_isActive_displayOrder_idx" ON "LeadCreditPackage"("isActive", "displayOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "LeadCreditPurchase_orderId_key" ON "LeadCreditPurchase"("orderId");
CREATE INDEX IF NOT EXISTS "LeadCreditPurchase_agentId_idx" ON "LeadCreditPurchase"("agentId");
CREATE INDEX IF NOT EXISTS "LeadCreditPurchase_status_idx" ON "LeadCreditPurchase"("status");
CREATE INDEX IF NOT EXISTS "LeadCreditLedger_agentId_createdAt_idx" ON "LeadCreditLedger"("agentId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadCreditLedger_type_idx" ON "LeadCreditLedger"("type");
CREATE INDEX IF NOT EXISTS "LeadCreditLedger_referenceId_idx" ON "LeadCreditLedger"("referenceId");
CREATE INDEX IF NOT EXISTS "LeadAssignmentStatusHistory_assignmentId_idx" ON "LeadAssignmentStatusHistory"("assignmentId");
CREATE INDEX IF NOT EXISTS "LeadAssignmentStatusHistory_changedAt_idx" ON "LeadAssignmentStatusHistory"("changedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTopup_leadCreditPurchaseId_key" ON "WalletTopup"("leadCreditPurchaseId");

DO $$ BEGIN
  ALTER TABLE "SpamReport" ADD CONSTRAINT "SpamReport_leadAssignmentId_fkey"
    FOREIGN KEY ("leadAssignmentId") REFERENCES "LeadAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WalletTopup" ADD CONSTRAINT "WalletTopup_leadCreditPurchaseId_fkey"
    FOREIGN KEY ("leadCreditPurchaseId") REFERENCES "LeadCreditPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AgentCreditBalance" ADD CONSTRAINT "AgentCreditBalance_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadCreditPurchase" ADD CONSTRAINT "LeadCreditPurchase_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadCreditPurchase" ADD CONSTRAINT "LeadCreditPurchase_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "LeadCreditPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadCreditLedger" ADD CONSTRAINT "LeadCreditLedger_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadCreditLedger" ADD CONSTRAINT "LeadCreditLedger_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "LeadCreditPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadCreditLedger" ADD CONSTRAINT "LeadCreditLedger_leadAssignmentId_fkey"
    FOREIGN KEY ("leadAssignmentId") REFERENCES "LeadAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadAssignmentStatusHistory" ADD CONSTRAINT "LeadAssignmentStatusHistory_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "LeadAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "LeadCreditPackage" ("id", "name", "credits", "priceInr", "isActive", "displayOrder", "updatedAt")
VALUES
  ('mvp_100_lead_credits', '100 Lead Credits', 100, 10000, true, 1, CURRENT_TIMESTAMP),
  ('mvp_150_lead_credits', '150 Lead Credits', 150, 15000, true, 2, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
  "priceInr" = EXCLUDED."priceInr",
  "isActive" = EXCLUDED."isActive",
  "displayOrder" = EXCLUDED."displayOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "AgentCreditBalance" ("id", "agentId", "balance", "updatedAt")
SELECT 'credit_balance_' || a."id", a."id", 0, CURRENT_TIMESTAMP
FROM "Agent" a
ON CONFLICT ("agentId") DO NOTHING;
