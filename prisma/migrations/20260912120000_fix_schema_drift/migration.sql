-- Reconciles production drift found via `prisma migrate diff` on 2026-09-12:
--  - AgentPreference.alertWhatsapp, the MessageTemplate table, and the
--    LeadAssignment(agentId, purchasedAt) index were all in schema.prisma
--    and in the 0_baseline migration file, but were never actually present
--    on the live database (drift predates this migration).
--  - business_settings/case_studies/cities/event_registrations/events/
--    gallery_images/page_blocks/service_pages were confirmed by the project
--    owner to have been added by mistake (not part of this app's schema) —
--    dropped per their explicit request.

-- DropForeignKey
ALTER TABLE "event_registrations" DROP CONSTRAINT "event_registrations_event_id_fkey";

-- AlterTable
ALTER TABLE "AgentPreference" ADD COLUMN     "alertWhatsapp" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "business_settings";

-- DropTable
DROP TABLE "case_studies";

-- DropTable
DROP TABLE "cities";

-- DropTable
DROP TABLE "event_registrations";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "gallery_images";

-- DropTable
DROP TABLE "page_blocks";

-- DropTable
DROP TABLE "service_pages";

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "providerTemplateName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "sendsVerbatim" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_key" ON "MessageTemplate"("key");

-- CreateIndex
CREATE INDEX "MessageTemplate_channel_idx" ON "MessageTemplate"("channel");

-- CreateIndex
CREATE INDEX "LeadAssignment_agentId_purchasedAt_idx" ON "LeadAssignment"("agentId", "purchasedAt");
