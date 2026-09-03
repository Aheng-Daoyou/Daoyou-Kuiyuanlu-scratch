ALTER TABLE "wanjiedaoyou_local_transaction_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wanjiedaoyou_sect_contribution_ledger" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wanjiedaoyou_sect_daily_commissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "wanjiedaoyou_local_transaction_messages" CASCADE;--> statement-breakpoint
DROP TABLE "wanjiedaoyou_sect_contribution_ledger" CASCADE;--> statement-breakpoint
DROP TABLE "wanjiedaoyou_sect_daily_commissions" CASCADE;--> statement-breakpoint
CREATE INDEX "sect_stipend_claimed_idx" ON "wanjiedaoyou_sect_stipend_claims" USING btree ("claimed_at");