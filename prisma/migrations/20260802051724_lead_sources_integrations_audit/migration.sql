-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integration" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leadId" TEXT,
    "externalId" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "destinationText" TEXT NOT NULL,
    "departureCity" TEXT,
    "travelDate" DATETIME,
    "travelDateText" TEXT,
    "travelers" INTEGER,
    "budget" INTEGER,
    "tripType" TEXT,
    "requirements" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "quality" TEXT NOT NULL DEFAULT 'UNREVIEWED',
    "qualityScore" INTEGER,
    "qualityOverride" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER,
    "assignmentCount" INTEGER NOT NULL DEFAULT 0,
    "maxAgents" INTEGER NOT NULL DEFAULT 2,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'website',
    "sourceType" TEXT NOT NULL DEFAULT 'website',
    "externalId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "gbraid" TEXT,
    "wbraid" TEXT,
    "fbclid" TEXT,
    "campaignId" TEXT,
    "adGroupId" TEXT,
    "keyword" TEXT,
    "creativeId" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT,
    "firstPage" TEXT,
    "lastPage" TEXT,
    "duplicateOfId" TEXT,
    "destinationId" TEXT,
    "packageId" TEXT,
    "packageSnapshotName" TEXT,
    "packageSnapshotPrice" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lead_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("assignmentCount", "budget", "code", "createdAt", "customerName", "departureCity", "destinationId", "destinationText", "email", "expiresAt", "fbclid", "firstPage", "gclid", "id", "isDuplicate", "landingPage", "lastPage", "maxAgents", "message", "packageId", "packageSnapshotName", "packageSnapshotPrice", "phone", "price", "quality", "qualityOverride", "qualityScore", "referrer", "requirements", "status", "travelDate", "travelDateText", "travelers", "tripType", "updatedAt", "utmCampaign", "utmContent", "utmMedium", "utmSource", "utmTerm") SELECT "assignmentCount", "budget", "code", "createdAt", "customerName", "departureCity", "destinationId", "destinationText", "email", "expiresAt", "fbclid", "firstPage", "gclid", "id", "isDuplicate", "landingPage", "lastPage", "maxAgents", "message", "packageId", "packageSnapshotName", "packageSnapshotPrice", "phone", "price", "quality", "qualityOverride", "qualityScore", "referrer", "requirements", "status", "travelDate", "travelDateText", "travelers", "tripType", "updatedAt", "utmCampaign", "utmContent", "utmMedium", "utmSource", "utmTerm" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_code_key" ON "Lead"("code");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE UNIQUE INDEX "Lead_source_externalId_key" ON "Lead"("source", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "IntegrationLog_integration_idx" ON "IntegrationLog"("integration");

-- CreateIndex
CREATE INDEX "IntegrationLog_createdAt_idx" ON "IntegrationLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
