# Data Model

RecipAI keeps two stores in sync: **Dexie.js** (IndexedDB, local working store — all reads and writes go through it, works without a session) and **Supabase Postgres** (source of truth when signed in — survives browser clears, works across devices).

---

## Dexie (local / offline)

**File:** `lib/db/db.ts` — database name `RecipeAppDB`, current version **12**.

### Tables

| Table | Primary key | Indexed fields | Type |
|---|---|---|---|
| `recipes` | `id` | `title`, `createdAt`, `updatedAt`, `status` | `Recipe` |
| `parsedRecipes` | `id` | `createdAt` | `ParsedRecipeEntry` |
| `collections` | `id` | `name`, `createdAt` | `Collection` |
| `notifications` | `id` | `entityId`, `entityType`, `type`, `createdAt` | `SyncNotification` |
| `ingredients` | `id` | `category` | `VocabularyIngredient` |
| `pantry` | `id` | `ingredientId` | `PantryItem` |
| `parseHistory` | `id` | `createdAt`, `status` | `ParseHistoryEntry` |

### Key types (`lib/db/schema.ts`)

#### Recipe
```ts
interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageFileId?: string;
  imageFocusX?: number;       // focal point, 0–100%
  imageFocusY?: number;
  imageCropX?: number;        // crop origin, 0–100%
  imageCropY?: number;
  imageCropWidth?: number;    // crop size, 0–100%
  imageCropHeight?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: Step[];
  sections?: RecipeSection[];
  sourceUrl?: string;
  category?: string;
  status?: "tried" | null;
  isPublic?: boolean;
  collectionIds?: string[];
  canonicalIngredientIds?: string[];
  unrecognizedIngredients?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

`isPublic` is optional for backward compatibility with legacy Dexie rows. A
missing value is treated as private; only `isPublic === true` means public.

#### RecipeIngredient / Step
```ts
interface RecipeIngredient {
  id: string;
  amount?: number;
  unit?: string;
  item: string;                        // cleaned display noun ("Mozzarella")
  modifiers?: PreparationModifier[];   // curated enum KEYs, display-only
  sectionId?: string | null;           // references Recipe.sections
  original?: string;                   // verbatim source ("Grated Mozzarella"),
                                       // present only when item was cleaned
}

interface Step {
  id: string;
  order: number;
  instruction: string;
  imageUrl?: string;
  sectionId?: string | null;           // references Recipe.sections
}

interface RecipeSection {
  id: string;
  name: string;
  order: number;
}
```

`modifiers`, `sectionId`, and `original` remain display-only metadata inside the
ingredient/step JSON arrays. `modifiers` stores language-agnostic keys from
`PREPARATION_MODIFIERS`; the parser supplies zero or one key and the edit form
allows multiple. `sectionId` points into the recipe-level `sections` catalog, so
renaming a group changes one catalog entry instead of rewriting every row.
Search, pantry, and vocabulary matching still use the hidden `en` head noun and
`canonicalIngredientIds`.

#### Collection
```ts
interface Collection {
  id: string;
  name: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### VocabularyIngredient
```ts
interface VocabularyIngredient {
  id: string;
  en: string;
  ua: string | null;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
  status?: "provisional" | "confirmed" | "failed";
  retryCount?: number;
  lastAttemptAt?: Date | null;
  embedding?: number[] | null;   // dormant legacy field; vectors are server-only
}
```

#### PantryItem
```ts
interface PantryItem {
  id: string;
  ingredientId?: string;   // links to VocabularyIngredient when matched
  name: string;
  qty: number;
  unit: string;
  cat: string;
  on: boolean;             // true = have it, false = out
  addedAt: Date;
}
```

#### ParseHistoryEntry
```ts
interface ParseHistoryEntry {
  id: string;              // matches the parse_jobs row id
  title: string;
  status: "done" | "failed";
  url?: string;            // absent for photo imports
  reason?: string;
  createdAt: Date;
}
```

Capped at **100 entries** — oldest are pruned automatically. See `lib/db/parse-history.ts`.

Photo imports use the same ID for their local history entry and server-side
`parse_jobs` row. Their server row has `url = null`, allowing anonymous photo
history to be claimed on login and pulled onto another device without retaining
the uploaded image.

#### SyncNotification
```ts
interface SyncNotification {
  id: string;
  entityId: string;
  entityType: "recipe" | "collection";
  type: "server_only" | "local_only" | "conflicted";
  serverSnapshot: string | null;
  localSnapshot: string | null;
  createdAt: Date;
}
```

### Migration history

| Version | Change |
|---|---|
| 1 | `recipes` |
| 2 | + `parsedRecipes` |
| 3 | `recipes` index gains `status` |
| 4 | + `collections` |
| 5 | + `notifications` |
| 6–7 | Schema-only bumps (no structural change) |
| 8 | + `ingredients`, + `pantry` (keyed by `ingredientId`) |
| 9 | Drop `pantry` to change its primary key in v10 |
| 10 | Recreate `pantry` with `id` as primary key |
| 11 | + `parseHistory` |
| 12 | Dedup pantry rows by `ingredientId` (upgrade callback; schema unchanged) |

To add a new migration, see [How-to: Add a Dexie Migration](../how-to/add-dexie-migration.md).

!!! warning "Supabase dates are strings"
    JSON from Supabase has `createdAt`/`updatedAt` as ISO strings. Always convert before writing to Dexie: `createdAt: new Date(row.createdAt)`. See `parseTimestamps` in `hooks/use-sync-on-login.ts`.

---

## Postgres (remote / Drizzle)

**Files:** `db/schema/*.ts` · **ORM:** Drizzle · **Host:** Supabase

### `recipes`

Mirrors the Dexie `Recipe` shape. `id` (text PK), `user_id` (FK → `user`, cascade delete), focal/crop percentages in `image_focus_*` and `image_crop_*`, and `ingredients` / `instructions` / `sections` / `collection_ids` / `canonical_ingredient_ids` / `unrecognized_ingredients` stored as jsonb. `sections` is added by migration `0023_clear_vanisher.sql`; apply that additive migration before deploying code that selects or writes the column. `is_public` is `boolean NOT NULL DEFAULT false`; only the dedicated visibility boundary changes publication state.

### `collections`

`id`, `user_id` (FK → `user`), `name`, `emoji` (default `⭐`), `created_at`, `updated_at`.

### `parse_jobs`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text | Nullable FK → `user`. `null` = anonymous job |
| `url` | text | Nullable — `null` for photo imports (no source URL). Migration `0018` |
| `normalized_url` | text | Indexed cache key — `url` with tracking params stripped and Instagram `reel`/`reels`/`p`/`tv` collapsed to one media id (`normalizeSourceUrl`). Migration `0017` |
| `parser_version` | text | Pipeline version that produced `result`; the cache only serves rows matching the current `PARSER_VERSION`. Migration `0017` |
| `user_comment` | text | **Dormant** — the AI-hint input was removed; the column is retained for a one-line restore |
| `telegram_chat_id` | text | Set when job originates from the Telegram bot |
| `push_endpoint` | text | Nullable. The push subscription endpoint to notify when the job completes |
| `status` | text | `pending` / `processing` / `done` / `failed` |
| `result` | jsonb | `ParsedRecipe` payload when done. The process route attempts an ImageKit upload at parse time; on upload failure the cached result retains the original source URL |
| `error` | text | Failure message when failed |
| `created_at`, `updated_at` | timestamp | |

**Result cache.** `POST /api/parse-queue` looks up a prior `done` job with the same `normalized_url` + current `parser_version` and a complete result (at least one ingredient and one instruction); on a hit it clones that result into a new `done` job (no Gemini call). See [parse-pipeline](../explanation/parse-pipeline.md#parse-queue-appapiparse-queue) and [gotchas](gotchas.md#database).

### `ingredients`

Global vocabulary shared across all users. `id`, `en`, `ua`, `category`, `aliases_en` (jsonb), `aliases_ua` (jsonb), `status` (`provisional` / `confirmed` / `failed`), `retry_count`, `last_attempt_at`, and `embedding` (`vector(384)`, nullable — the e5 `passage:` vector used by server-side pgvector matching). The vector extension and column conversion are migration `0019`; existing JSON vectors are cast in place. No ANN index is used at the current vocabulary size, so matching performs an exact cosine-distance scan.

Vectors are not returned by `GET /api/ingredients` and are not synced to Dexie. `VocabularyIngredient.embedding` remains as a dormant optional client field to avoid an IndexedDB schema migration, but runtime matching never reads it. `created_at` / `updated_at` are `timestamptz` (migration `0016`) — the delta-sync watermark compares `updated_at`, so a timezone-naive column could skip a boundary row (see [gotchas](gotchas.md#database)).

### `pantry`

`id`, `user_id` (FK → `user`), `ingredient_id` (nullable FK → `ingredients`, set null on delete), `name`, `qty`, `unit`, `cat`, `on` (boolean), `added_at`.

One row per `(user_id, ingredient_id)`, enforced by a **partial unique index** `pantry_user_ingredient_uniq` (`WHERE ingredient_id IS NOT NULL`, so free-text items can coexist) — migration `0015`. `POST /api/pantry` updates an existing `(user, ingredient)` row in place rather than inserting a duplicate; `addPantryItem` mirrors this client-side by upserting on `ingredientId` in Dexie.

**Dormant columns:** `qty`, `unit`, and `cat` are no longer user-editable. `addPantryItem` writes defaults (`qty=1`, `unit="pcs"`, `cat="Other"`) and the UI omits them — same treatment as `user_comment`. The DB columns and Postgres schema are unchanged; no migration needed.

### `push_subscriptions`

Stores browser push subscriptions so the server can send notifications when a parse job completes.

| Column | Type | Notes |
|---|---|---|
| `endpoint` | text PK | Browser push endpoint URL |
| `p256dh` | text | Client public key (base64url) |
| `auth` | text | Client auth secret (base64url) |
| `user_id` | text | Nullable FK → `user`. Linked when the subscribing browser has an active session |
| `created_at` | timestamp | |

### `app_config`

Single-row global kill switch, read by the maintenance-mode middleware (`proxy.ts` / `lib/maintenance.ts`) before every `/api/*` request except `/api/auth` and `/api/manifest`. See [api-routes](api-routes.md#maintenance-mode).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Always `"global"` (`GLOBAL_APP_CONFIG_ID`) — single row |
| `maintenance_enabled` | boolean | Default `false`. When `true`, gated routes return `503` |
| `maintenance_message` | text | Nullable — shown to the client; falls back to a default string when unset |
| `updated_at` | timestamp | |

Toggled directly via the Supabase dashboard — no admin UI.

### Auth tables

Managed by better-auth. Schema in `db/schema/auth.ts` — includes `user`, `session`, `account`, `verification`, `passkey`, and `device_code` (the PWA device-authorization grant — see [Auth & Sync](../explanation/auth-and-sync.md)). Do not edit manually.
