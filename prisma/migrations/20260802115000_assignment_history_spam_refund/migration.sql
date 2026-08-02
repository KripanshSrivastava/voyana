-- CreateTable
CREATE TABLE "LeadAssignmentStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "LeadAssignmentStatusHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LeadAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpamReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "leadAssignmentId" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "refundedAt" DATETIME,
    "refundAmount" INTEGER,
    "refundWalletTransactionId" TEXT,
    CONSTRAINT "SpamReport_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpamReport_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpamReport_leadAssignmentId_fkey" FOREIGN KEY ("leadAssignmentId") REFERENCES "LeadAssignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SpamReport" ("id", "leadId", "agentId", "reason", "notes", "status", "resolution", "createdAt", "reviewedAt", "reviewedBy") SELECT "id", "leadId", "agentId", "reason", "notes", "status", "resolution", "createdAt", "reviewedAt", "reviewedBy" FROM "SpamReport";
DROP TABLE "SpamReport";
ALTER TABLE "new_SpamReport" RENAME TO "SpamReport";
CREATE UNIQUE INDEX "SpamReport_leadId_agentId_key" ON "SpamReport"("leadId", "agentId");
CREATE INDEX "SpamReport_status_idx" ON "SpamReport"("status");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LeadAssignmentStatusHistory_assignmentId_idx" ON "LeadAssignmentStatusHistory"("assignmentId");

-- CreateIndex
CREATE INDEX "LeadAssignmentStatusHistory_changedAt_idx" ON "LeadAssignmentStatusHistory"("changedAt");