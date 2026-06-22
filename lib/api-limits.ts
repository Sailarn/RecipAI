export const MAX_COLLECTION_NAME_LENGTH = 200;
export const MAX_COLLECTION_EMOJI_LENGTH = 10;
export const MAX_SYNC_BATCH_SIZE = 200;

// AI parse rate limits — shared bucket across URL and photo parses, per hour.
// Anonymous is keyed by IP, signed-in by user id (a higher allowance).
export const PARSE_RATE_LIMIT = {
  ANON: { limit: 15, windowSeconds: 3600 },
  USER: { limit: 60, windowSeconds: 3600 },
} as const;

// Embedding endpoints. The per-request item/text caps bound a single request's
// model + pgvector work; the public embed-match route is additionally
// rate-limited per caller (anon by IP, signed-in by user id).
export const EMBED_MAX_ITEMS = 64;
export const EMBED_MAX_TEXT_LENGTH = 200;
export const EMBED_RATE_LIMIT = {
  ANON: { limit: 120, windowSeconds: 60 },
  USER: { limit: 600, windowSeconds: 60 },
} as const;

export const COLLECTION_ERRORS = {
  NAME_REQUIRED: "name required",
  NAME_TOO_LONG: `name must be ${MAX_COLLECTION_NAME_LENGTH} characters or fewer`,
  EMOJI_TOO_LONG: `emoji must be ${MAX_COLLECTION_EMOJI_LENGTH} characters or fewer`,
  ARRAY_REQUIRED: "collections array required",
  INVALID_ITEMS: "one or more collections are invalid",
  TOO_MANY: `too many collections — maximum ${MAX_SYNC_BATCH_SIZE} per sync`,
} as const;

export const RECIPE_SYNC_ERRORS = {
  TOO_MANY: `too many recipes — maximum ${MAX_SYNC_BATCH_SIZE} per sync`,
} as const;
