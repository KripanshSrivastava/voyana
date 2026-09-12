-- Adds the auto-buy purchase-type preference (SHARED | EXCLUSIVE).
-- AlterTable
ALTER TABLE "AgentPreference" ADD COLUMN     "autoBuyPurchaseType" TEXT NOT NULL DEFAULT 'SHARED';
