-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authId" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "adminRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "emailVerifiedAt" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "firstName" TEXT,
    "lastName" TEXT,
    "profileImage" TEXT,
    "personalEmail" TEXT,
    "state" TEXT,
    "companyAddress" TEXT,
    "companyEmail" TEXT,
    "contactPerson" TEXT,
    "contactNo" TEXT,
    "website" TEXT,
    "socials" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    "lowWalletThreshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPreference" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "alertEmail" BOOLEAN NOT NULL DEFAULT true,
    "alertInApp" BOOLEAN NOT NULL DEFAULT true,
    "alertWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "alertCategories" TEXT,
    "alertDestinations" TEXT,
    "alertClientLocations" TEXT,
    "alertMinQuality" TEXT,
    "alertMinBudget" INTEGER,
    "alertMaxBudget" INTEGER,
    "alertMinLeadPrice" INTEGER,
    "alertMaxLeadPrice" INTEGER,
    "alertTravelDateFrom" TIMESTAMP(3),
    "alertTravelDateTo" TIMESTAMP(3),
    "alertTripTypes" TEXT,
    "autoBuyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoBuyCategories" TEXT,
    "autoBuyDestinations" TEXT,
    "autoBuyClientLocations" TEXT,
    "autoBuyMinQuality" TEXT,
    "autoBuyMinBudget" INTEGER,
    "autoBuyMaxBudget" INTEGER,
    "autoBuyMaxPrice" INTEGER,
    "autoBuyTravelDateFrom" TIMESTAMP(3),
    "autoBuyTravelDateTo" TIMESTAMP(3),
    "autoBuyTripTypes" TEXT,
    "autoBuyDailyLimit" INTEGER,
    "autoBuyMonthlyBudget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpamReport" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "leadAssignmentId" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "refundWalletTransactionId" TEXT,

    CONSTRAINT "SpamReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorLabel" TEXT,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAd" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "landingUrl" TEXT,
    "destination" TEXT,
    "targetType" TEXT,
    "targetSubmissionId" TEXT,
    "clientLocation" TEXT,
    "category" TEXT,
    "dailyBudget" INTEGER,
    "maxBid" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTopup" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "leadCreditPurchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWallet" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCreditBalance" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCreditPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "paymentQrUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCreditPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCreditPurchase" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "paymentScreenshotUrl" TEXT,
    "transactionReference" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCreditLedger" (
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

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "destinationText" TEXT NOT NULL,
    "departureCity" TEXT,
    "travelDate" TIMESTAMP(3),
    "travelDateText" TEXT,
    "travelers" INTEGER,
    "adults" INTEGER,
    "children" INTEGER,
    "nights" INTEGER,
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
    "expiresAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'website',
    "sourceType" TEXT NOT NULL DEFAULT 'website',
    "externalId" TEXT,
    "tripCategory" TEXT,
    "clientLocation" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PURCHASED',
    "bookedValue" INTEGER,
    "bookedAt" TIMESTAMP(3),
    "bookingNotes" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignmentStatusHistory" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "LeadAssignmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL DEFAULT 'ADMIN',
    "authorLabel" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPayment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "heroImage" TEXT,
    "gallery" TEXT,
    "startingPrice" INTEGER,
    "bestTime" TEXT,
    "tripTypes" TEXT,
    "highlights" TEXT,
    "faqs" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "submittedByAgentId" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPackage" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PACKAGE',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destinationId" TEXT,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "heroImage" TEXT,
    "durationDays" INTEGER,
    "durationNights" INTEGER,
    "durationText" TEXT,
    "startingPrice" INTEGER,
    "offerPrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "priceLabel" TEXT,
    "hotelCategory" TEXT,
    "accommodation" TEXT,
    "transport" TEXT,
    "activities" TEXT,
    "tripType" TEXT,
    "difficulty" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "submittedByAgentId" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageImage" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItinerary" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageInclusion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageExclusion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageFAQ" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageFAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "brandName" TEXT NOT NULL DEFAULT 'Moksh Booking',
    "tagline" TEXT NOT NULL DEFAULT 'Your trip. Your way.',
    "logoUrl" TEXT,
    "heroImage" TEXT,
    "faviconUrl" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "socials" TEXT,
    "defaultLeadPrice" INTEGER NOT NULL DEFAULT 750,
    "leadMaxAgents" INTEGER NOT NULL DEFAULT 2,
    "leadExpiryHours" INTEGER NOT NULL DEFAULT 72,
    "leadValidityDays" INTEGER NOT NULL DEFAULT 365,
    "priceSharedDomestic" INTEGER NOT NULL DEFAULT 1,
    "priceSharedInternational" INTEGER NOT NULL DEFAULT 1,
    "priceExclusiveDomestic" INTEGER NOT NULL DEFAULT 2,
    "priceExclusiveInternational" INTEGER NOT NULL DEFAULT 2,
    "adCostPerClickCredits" INTEGER NOT NULL DEFAULT 10,
    "footerText" TEXT,
    "defaultSeoTitle" TEXT,
    "defaultSeoDescription" TEXT,
    "gaId" TEXT,
    "metaPixelId" TEXT,
    "googleAdsId" TEXT,
    "vendorAdsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoBuyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "packageMarketplaceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "medium" TEXT,
    "utmCampaign" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leadId" TEXT,
    "externalId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_type_consumedAt_idx" ON "VerificationToken"("userId", "type", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPreference_agentId_key" ON "AgentPreference"("agentId");

-- CreateIndex
CREATE INDEX "SpamReport_status_idx" ON "SpamReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SpamReport_leadId_agentId_key" ON "SpamReport"("leadId", "agentId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_agentId_idx" ON "SupportTicket"("agentId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "VendorAd_status_idx" ON "VendorAd"("status");

-- CreateIndex
CREATE INDEX "VendorAd_agentId_idx" ON "VendorAd"("agentId");

-- CreateIndex
CREATE INDEX "VendorAd_targetType_targetSubmissionId_idx" ON "VendorAd"("targetType", "targetSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopup_orderId_key" ON "WalletTopup"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopup_leadCreditPurchaseId_key" ON "WalletTopup"("leadCreditPurchaseId");

-- CreateIndex
CREATE INDEX "WalletTopup_agentId_idx" ON "WalletTopup"("agentId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWallet_agentId_key" ON "AgentWallet"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCreditBalance_agentId_key" ON "AgentCreditBalance"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCreditPackage_code_key" ON "LeadCreditPackage"("code");

-- CreateIndex
CREATE INDEX "LeadCreditPackage_isActive_displayOrder_idx" ON "LeadCreditPackage"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCreditPurchase_orderId_key" ON "LeadCreditPurchase"("orderId");

-- CreateIndex
CREATE INDEX "LeadCreditPurchase_agentId_idx" ON "LeadCreditPurchase"("agentId");

-- CreateIndex
CREATE INDEX "LeadCreditPurchase_status_idx" ON "LeadCreditPurchase"("status");

-- CreateIndex
CREATE INDEX "LeadCreditLedger_agentId_createdAt_idx" ON "LeadCreditLedger"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadCreditLedger_type_idx" ON "LeadCreditLedger"("type");

-- CreateIndex
CREATE INDEX "LeadCreditLedger_referenceId_idx" ON "LeadCreditLedger"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_code_key" ON "Lead"("code");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_source_externalId_key" ON "Lead"("source", "externalId");

-- CreateIndex
CREATE INDEX "LeadAssignment_agentId_purchasedAt_idx" ON "LeadAssignment"("agentId", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAssignment_leadId_agentId_key" ON "LeadAssignment"("leadId", "agentId");

-- CreateIndex
CREATE INDEX "LeadAssignmentStatusHistory_assignmentId_idx" ON "LeadAssignmentStatusHistory"("assignmentId");

-- CreateIndex
CREATE INDEX "LeadAssignmentStatusHistory_changedAt_idx" ON "LeadAssignmentStatusHistory"("changedAt");

-- CreateIndex
CREATE INDEX "LeadPayment_createdAt_idx" ON "LeadPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE INDEX "Destination_submittedByAgentId_idx" ON "Destination"("submittedByAgentId");

-- CreateIndex
CREATE INDEX "Destination_moderationStatus_idx" ON "Destination"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TourPackage_slug_key" ON "TourPackage"("slug");

-- CreateIndex
CREATE INDEX "TourPackage_submittedByAgentId_idx" ON "TourPackage"("submittedByAgentId");

-- CreateIndex
CREATE INDEX "TourPackage_moderationStatus_idx" ON "TourPackage"("moderationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Media_filename_key" ON "Media"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_key" ON "MessageTemplate"("key");

-- CreateIndex
CREATE INDEX "MessageTemplate_channel_idx" ON "MessageTemplate"("channel");

-- CreateIndex
CREATE INDEX "IntegrationLog_integration_idx" ON "IntegrationLog"("integration");

-- CreateIndex
CREATE INDEX "IntegrationLog_createdAt_idx" ON "IntegrationLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPreference" ADD CONSTRAINT "AgentPreference_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpamReport" ADD CONSTRAINT "SpamReport_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpamReport" ADD CONSTRAINT "SpamReport_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpamReport" ADD CONSTRAINT "SpamReport_leadAssignmentId_fkey" FOREIGN KEY ("leadAssignmentId") REFERENCES "LeadAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAd" ADD CONSTRAINT "VendorAd_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopup" ADD CONSTRAINT "WalletTopup_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopup" ADD CONSTRAINT "WalletTopup_leadCreditPurchaseId_fkey" FOREIGN KEY ("leadCreditPurchaseId") REFERENCES "LeadCreditPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWallet" ADD CONSTRAINT "AgentWallet_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "AgentWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCreditBalance" ADD CONSTRAINT "AgentCreditBalance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCreditPurchase" ADD CONSTRAINT "LeadCreditPurchase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCreditPurchase" ADD CONSTRAINT "LeadCreditPurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "LeadCreditPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCreditLedger" ADD CONSTRAINT "LeadCreditLedger_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCreditLedger" ADD CONSTRAINT "LeadCreditLedger_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "LeadCreditPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCreditLedger" ADD CONSTRAINT "LeadCreditLedger_leadAssignmentId_fkey" FOREIGN KEY ("leadAssignmentId") REFERENCES "LeadAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignmentStatusHistory" ADD CONSTRAINT "LeadAssignmentStatusHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LeadAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPayment" ADD CONSTRAINT "LeadPayment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPayment" ADD CONSTRAINT "LeadPayment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_submittedByAgentId_fkey" FOREIGN KEY ("submittedByAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_submittedByAgentId_fkey" FOREIGN KEY ("submittedByAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageImage" ADD CONSTRAINT "PackageImage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItinerary" ADD CONSTRAINT "PackageItinerary_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageInclusion" ADD CONSTRAINT "PackageInclusion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageExclusion" ADD CONSTRAINT "PackageExclusion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageFAQ" ADD CONSTRAINT "PackageFAQ_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
