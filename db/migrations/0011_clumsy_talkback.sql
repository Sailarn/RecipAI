ALTER TABLE "ingredients" ALTER COLUMN "ua" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "status" text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "last_attempt_at" timestamp;