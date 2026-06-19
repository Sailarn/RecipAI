ALTER TABLE "parse_jobs" ADD COLUMN "normalized_url" text;--> statement-breakpoint
ALTER TABLE "parse_jobs" ADD COLUMN "parser_version" text;--> statement-breakpoint
CREATE INDEX "parse_jobs_normalized_url_idx" ON "parse_jobs" USING btree ("normalized_url");