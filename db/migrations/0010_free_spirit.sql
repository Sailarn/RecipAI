CREATE TABLE "ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"en" text NOT NULL,
	"ua" text NOT NULL,
	"category" text NOT NULL,
	"aliases_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aliases_ua" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry" (
	"ingredient_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pantry_ingredient_id_user_id_pk" PRIMARY KEY("ingredient_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "canonical_ingredient_ids" jsonb;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "unrecognized_ingredients" jsonb;--> statement-breakpoint
ALTER TABLE "pantry" ADD CONSTRAINT "pantry_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry" ADD CONSTRAINT "pantry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;