CREATE TABLE "wanjiedaoyou_debt_ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cultivator_id" uuid NOT NULL,
	"creditor" varchar(32) NOT NULL,
	"collateral" varchar(16) NOT NULL,
	"principal" integer NOT NULL,
	"outstanding" integer NOT NULL,
	"annual_interest_rate" double precision DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"incurred_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp NOT NULL,
	"default_consequence" jsonb,
	"settled_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wanjiedaoyou_invitation_lamps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"referrer_user_id" uuid,
	"note" varchar(200),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"total_limit" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"used_by_user_id" uuid,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wanjiedaoyou_debt_ledgers" ADD CONSTRAINT "wanjiedaoyou_debt_ledgers_cultivator_id_wanjiedaoyou_cultivators_id_fk" FOREIGN KEY ("cultivator_id") REFERENCES "public"."wanjiedaoyou_cultivators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debt_ledgers_cultivator_status_idx" ON "wanjiedaoyou_debt_ledgers" USING btree ("cultivator_id","status");--> statement-breakpoint
CREATE INDEX "debt_ledgers_status_due_idx" ON "wanjiedaoyou_debt_ledgers" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "debt_ledgers_cultivator_creditor_idx" ON "wanjiedaoyou_debt_ledgers" USING btree ("cultivator_id","creditor");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_lamps_code_unique" ON "wanjiedaoyou_invitation_lamps" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invitation_lamps_status_created_idx" ON "wanjiedaoyou_invitation_lamps" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "invitation_lamps_referrer_idx" ON "wanjiedaoyou_invitation_lamps" USING btree ("referrer_user_id");