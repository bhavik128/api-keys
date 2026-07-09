CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" text NOT NULL,
	"service_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"key_type" text DEFAULT 'standard' NOT NULL,
	"name" text NOT NULL,
	"environment" text DEFAULT 'test' NOT NULL,
	"public_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"display_prefix" text NOT NULL,
	"last4" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"usage_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" text,
	"service_id" uuid,
	"api_key_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"number" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scope" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"service_id" uuid NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_link" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"target_url" text NOT NULL,
	"hits" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "short_link_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tier" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"rate_limit_per_min" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_tier_id_tier_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tier"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link" ADD CONSTRAINT "short_link_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier" ADD CONSTRAINT "tier_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_owner_idx" ON "api_key" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "api_key_service_idx" ON "api_key" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "api_key_tier_idx" ON "api_key" USING btree ("tier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_public_id_idx" ON "api_key" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "api_key_status_idx" ON "api_key" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_key_idx" ON "audit_log" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "audit_owner_idx" ON "audit_log" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "audit_service_idx" ON "audit_log" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "invoice_api_key_idx" ON "invoice" USING btree ("api_key_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scope_service_value_idx" ON "scope" USING btree ("service_id","value");--> statement-breakpoint
CREATE INDEX "service_owner_idx" ON "service" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_owner_slug_idx" ON "service" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "short_link_api_key_idx" ON "short_link" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "tier_owner_idx" ON "tier" USING btree ("owner_id");