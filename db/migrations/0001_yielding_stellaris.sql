CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"image_file_id" text,
	"prep_time" integer,
	"cook_time" integer,
	"total_time" integer,
	"servings" integer NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;