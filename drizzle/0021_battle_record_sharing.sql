ALTER TABLE "wanjiedaoyou_battle_records_v3" ADD COLUMN "share_code" uuid;--> statement-breakpoint
ALTER TABLE "wanjiedaoyou_battle_records_v3" ADD COLUMN "shared_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "battle_records_v3_share_code_uidx" ON "wanjiedaoyou_battle_records_v3" USING btree ("share_code");