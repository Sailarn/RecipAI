// lib/telemetry/events.ts

/** Every analytics event in the app. Adding an event = adding an entry here.
 *  Inline event-name strings at call sites are forbidden. */
export type TelemetryEvents = {
  // identity
  signup: { method: "google" | "passkey" | "telegram" };
  login: { method: "google" | "passkey" | "telegram" };
  logout: undefined;
  account_linked: { provider: string };
  // parse funnel
  parse_started: { source: "url" | "photo"; domain?: string };
  parse_succeeded: { source: "url" | "photo" };
  parse_failed: { source: "url" | "photo"; reason: string };
  social_parse_started: {
    platform: "instagram" | "tiktok" | "youtube" | "x";
  };
  social_parse_succeeded: {
    platform: "instagram" | "tiktok" | "youtube" | "x";
    path: "actor_transcript" | "media_transcription" | "caption_image";
    duration_seconds?: number;
  };
  social_parse_failed: {
    platform: "instagram" | "tiktok" | "youtube" | "x" | "unknown";
    reason:
      | "duration_limit"
      | "media_too_large"
      | "unsupported_platform"
      | "restricted"
      | "not_found"
      | "no_content"
      | "unexpected";
  };
  parse_reviewed: undefined;
  recipe_saved: { source: "parse" | "edit" };
  ingredients_normalized: { matched: number; total: number };
  embed_match: {
    total: number;
    textMatched: number;
    embedMatched: number;
    provisionalCreated: number;
    degraded: boolean;
  };
  // recipe lifecycle (recipe edits are recipe_saved {source:"edit"} — no separate event)
  recipe_viewed: { via: "list" | "search" | "collection" | "deep_link" };
  recipe_deleted: undefined;
  step_images_viewed: undefined;
  recipe_tried_toggled: { tried: boolean };
  servings_adjusted: { servings: number };
  // engagement
  search_performed: { query: string; results_count: number };
  filter_applied: { kind: "category" | "status" | "sort" | "collection" };
  collection_created: undefined;
  collection_assigned: undefined;
  pantry_item_added: undefined;
  pantry_item_toggled: { have: boolean };
  theme_changed: { theme: string };
  language_changed: { locale: string };
  push_subscribed: undefined;
  push_unsubscribed: undefined;
  pwa_installed: undefined;
  telegram_mini_app_launched: { hasStartParam: boolean };
  parse_history_viewed: undefined;
  sync_review_resolved: { choice: string };
  // server-side mirrors (cost/abuse alerting)
  ai_fallback_to_deepseek: { context: "recipe" | "ingredient" | "photo" };
  ai_fallback_to_openai: { context: "recipe" | "ingredient" | "photo" };
  rate_limit_hit: { caller_type: "user" | "anon" };
};

export type EventName = keyof TelemetryEvents;
