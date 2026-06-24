import { z } from "zod";
import { EMBED_MAX_ITEMS, EMBED_MAX_TEXT_LENGTH } from "@/lib/api-limits";

// Bounds on the public/secret embed routes: a single request can never queue
// more than EMBED_MAX_ITEMS embeds, each capped at EMBED_MAX_TEXT_LENGTH chars,
// so one request can't exhaust the model host or the DB connection pool.
const boundedText = z.string().trim().min(1).max(EMBED_MAX_TEXT_LENGTH);

export const embedRequestSchema = z.object({
  texts: z.array(boundedText).min(1).max(EMBED_MAX_ITEMS),
  prefix: z.enum(["query", "passage"]).optional(),
});

export const embedMatchRequestSchema = z.object({
  items: z
    .array(
      z.object({
        item: boundedText,
        ua: z.string().max(EMBED_MAX_TEXT_LENGTH).nullish(),
        // Normalized English head; the route embeds this in preference to `item`.
        en: z.string().max(EMBED_MAX_TEXT_LENGTH).nullish(),
      }),
    )
    .min(1)
    .max(EMBED_MAX_ITEMS),
});

export type EmbedRequest = z.infer<typeof embedRequestSchema>;
export type EmbedMatchRequest = z.infer<typeof embedMatchRequestSchema>;
