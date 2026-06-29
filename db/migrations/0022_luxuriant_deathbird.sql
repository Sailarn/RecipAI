CREATE TABLE "app_config" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"maintenance_enabled" boolean DEFAULT false NOT NULL,
	"maintenance_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_config" ("id", "maintenance_enabled", "maintenance_message")
VALUES ('global', false, null);
