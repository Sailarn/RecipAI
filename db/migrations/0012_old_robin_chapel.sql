ALTER TABLE "pantry" DROP CONSTRAINT "pantry_ingredient_id_ingredients_id_fk";
--> statement-breakpoint
ALTER TABLE "pantry" DROP CONSTRAINT "pantry_ingredient_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "pantry" ALTER COLUMN "ingredient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD COLUMN "qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD COLUMN "unit" text DEFAULT 'pcs' NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD COLUMN "cat" text DEFAULT 'Other' NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD COLUMN "on" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pantry" ADD CONSTRAINT "pantry_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;