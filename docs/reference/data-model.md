# Data Model

RecipAI keeps two stores in sync: **Dexie.js** (IndexedDB, local working store — all reads and writes go through it, works without a session) and **Supabase Postgres** (source of truth when signed in — survives browser clears, works across devices).

---

## Dexie (local / offline)

**File:** `lib/db/db.ts` — database name `RecipeAppDB`, current version **11**.

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
  prepTime?: number; cookTime?: number; totalTime?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: Step[];
  sourceUrl?: string;
  category?: string;
  status?: "tried" | null;
  collectionIds?: string[];
  canonicalIngredientIds?: string[];
  unrecognizedIngredients?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

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

To add a new migration, see [How-to: Add a Dexie Migration](../how-to/add-dexie-migration.md).

!!! warning "Supabase dates are strings"
    JSON from Supabase has `createdAt`/`updatedAt` as ISO strings. Always convert before writing to Dexie: `createdAt: new Date(row.createdAt)`. See `parseTimestamps` in `hooks/use-sync-on-login.ts`.

---

## Postgres (remote / Drizzle)

**Files:** `db/schema/*.ts` · **ORM:** Drizzle · **Host:** Supabase

### `recipes`

Mirrors the Dexie `Recipe` shape. `id` (text PK), `user_id` (FK → `user`, cascade delete), `ingredients` / `instructions` / `collection_ids` / `canonical_ingredient_ids` stored as jsonb.

### `collections`

`id`, `user_id` (FK → `user`), `name`, `emoji` (default `⭐`), `created_at`, `updated_at`.

### `parse_jobs`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text | Nullable FK → `user`. `null` = anonymous job |
| `url` | text | |
| `user_comment` | text | Optional hint passed to AI |
| `telegram_chat_id` | text | Set when job originates from the Telegram bot |
| `status` | text | `pending` / `processing` / `done` / `failed` |
| `result` | jsonb | `ParsedRecipe` payload when done |
| `error` | text | Failure message when failed |
| `created_at`, `updated_at` | timestamp | |

### `ingredients`

Global vocabulary shared across all users. `id`, `en`, `ua`, `category`, `aliases_en` (jsonb), `aliases_ua` (jsonb), `status` (`provisional` / `confirmed` / `failed`), `retry_count`, `last_attempt_at`.

### `pantry`

`id`, `user_id` (FK → `user`), `ingredient_id` (nullable FK → `ingredients`, set null on delete), `name`, `qty`, `unit`, `cat`, `on` (boolean), `added_at`.

### Auth tables

Managed by better-auth. Schema in `db/schema/auth.ts` — includes `user`, `session`, `account`, `verification`. Do not edit manually.
