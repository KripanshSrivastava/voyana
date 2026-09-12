-- Default auto-buy purchase type is now EXCLUSIVE instead of SHARED.
-- Only changes the column DEFAULT (applies to new rows going forward) —
-- deliberately does not touch existing rows, so an agent who already chose
-- SHARED explicitly keeps that choice.
ALTER TABLE "AgentPreference" ALTER COLUMN "autoBuyPurchaseType" SET DEFAULT 'EXCLUSIVE';
