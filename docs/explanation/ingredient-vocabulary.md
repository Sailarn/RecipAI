# Ingredient Vocabulary

How parsed ingredient strings are matched to a shared canonical vocabulary — fuzzy matching, on-device embeddings, and AI enrichment.

---

## Why a vocabulary

A parsed recipe arrives with free-text ingredient strings ("2 tbsp соєвого соусу", "soy sauce, to taste"). To power pantry matching, ingredient filters, and bilingual display (EN/UA), each string is resolved to a **canonical vocabulary entry**. The recipe stores the result as `canonicalIngredientIds` (plus `unrecognizedIngredients` for strings that can't be matched).

The vocabulary itself is the `ingredients` table — global, shared across all users, in both stores (Dexie locally, Postgres remotely). Each entry has `en`, `ua`, a category, alias arrays in both languages, and a status:

| Status | Meaning |
|---|---|
| `confirmed` | Curated or AI-enriched — participates in matching |
| `provisional` | Just created from an unmatched string — raw text, no aliases yet |
| `failed` | AI enrichment gave up (or the string isn't food) |

The initial dataset is curated JSON in `scripts/vocab/*.json`, merged into `scripts/ingredients-seed.json` and seeded into Postgres with `scripts/seed-ingredients.ts`.

The confirmed vocabulary is also the **only** thing users can pick from when adding ingredients by hand — both the pantry and the recipe form select from it through the shared `components/ingredient-picker/` (no free-text entry). See [Curated ingredient input](decisions.md#curated-ingredient-input-tap-dont-type). Parsing still produces free-text strings, which is what the rest of this page is about.

---

## The matching pipeline (`lib/parse-recipe/normalize-ingredients.ts`)

`normalizeRecipeIngredients(recipeId, ingredients)` runs each string through four stages, cheapest first:

```mermaid
graph TD
    A[Ingredient string] --> B{Null pattern?<br/>to taste, за смаком, …}
    B -->|yes| U[unrecognizedIngredients]
    B -->|no| C{Fuse.js fuzzy match<br/>en + ua + aliases}
    C -->|hit| ID[canonicalIngredientIds]
    C -->|miss| D{Embedding match<br/>cosine vs vocab embeddings}
    D -->|hit| ID
    D -->|miss| E[Create provisional entry]
    E --> F[AI enrichment - signed-in only]
    E --> ID
```

**1. Null patterns.** Phrases like "to taste" / "за смаком" / "for garnish" are not ingredients — they go straight to `unrecognizedIngredients`.

**2. Fuse.js fuzzy match.** A Fuse index (threshold 0.2) is built over every confirmed entry's `en`, `ua`, and both alias arrays, from the **local Dexie copy** of the vocabulary. Parenthesised text is stripped first. If the full string misses, each token longer than 3 chars is tried individually — handling phrases like "кетчупу Торчин для дітей" → "кетчупу" → ketchup — with a guard that the matched alias is at most 2 words, so a common word can't hit a long alias phrase.

**3. Embedding match.** Strings that survive Fuse are embedded on-device (see below) and compared by cosine similarity against the vocabulary embeddings stored on the **local Dexie copy** of each entry (the `embedding` field, delta-synced from the server — see [delivery](#how-embeddings-are-delivered)). A match is accepted only when the best score is **≥ 0.82** and leads the runner-up by **≥ 0.08** — ambiguous matches fall through rather than guess.

**4. Provisional + enrichment.** Anything still unmatched becomes a new provisional entry (deduplicated by raw text), written to Dexie immediately and upserted to Postgres via `POST /api/ingredients`. In parallel, `POST /api/ingredients/enrich` asks the AI to fill in the canonical name, Ukrainian translation, category, and aliases — on success the entry flips to `confirmed`.

The result is written to the recipe (`canonicalIngredientIds`, `unrecognizedIngredients`) in Dexie and fire-and-forget synced to Postgres.

### When it runs

- On every recipe save — both the review-form path (`components/recipe-form/use-recipe-save.ts`) and the direct parse-save path (`lib/db/save-parsed-recipe.ts`).
- On startup as a backfill — `useNormalizeOnStartup` (`lib/hooks/use-normalize-on-startup.ts`) re-normalizes any recipe that has ingredients but no `canonicalIngredientIds` yet (e.g. saved before this feature existed, or while matching was unavailable).

---

## The on-device embedding model

Embeddings are computed **client-side** — no API call, works offline once downloaded:

- **Model:** `Xenova/multilingual-e5-small` via `@huggingface/transformers`, running in a Web Worker (`lib/parse-recipe/embed-worker.ts`) so the main thread never blocks. E5 convention: queries are embedded with a `query:` prefix, the vocabulary with `passage:` — the worker takes a `prefix` param so the same pipeline serves both.
- **Consent first.** The model is a ~117 MB download, so it is gated behind an explicit opt-in: `EmbedConsentModal` (mounted in `client-shell`) asks once per device and stores the answer in `localStorage` (`embedModelConsent`). Without consent, `getIngredientEmbeddings` throws `EmbedConsentRequired` and the pipeline silently skips stage 3.
- **Manual re-entry.** If the user declines ("Not now"), the notifications bell sheet (`ParsedRecipesSheet`) surfaces a "Download model" prompt whenever the model is not yet ready (`isEmbedModelReady()` is false). Tapping it grants consent and pre-warms the worker — the only in-app way back to the download after skipping the modal.
- **Progress UX.** The worker reports download progress via `window` events; `use-embed-download.ts` exposes them as a hook (`idle` / `downloading` / `done`) for the notifications bell. After consent is granted the worker is pre-warmed so the download starts immediately.
- Embeddings are L2-normalized, so the dot product *is* the cosine similarity. Worker calls time out after 120 s.

### How embeddings are delivered

Vocabulary embeddings live in the `embedding` (jsonb) column on the `ingredients` row — there is **no static file**. The DB is a dumb carrier: matching stays client-side, no pgvector. Each vector reaches the client inside the existing delta sync (`GET /api/ingredients?since=`) and is stored on the Dexie row, so `getVocabEmbeddings` reads them straight from Dexie.

Vectors are produced two ways, both with e5 (`passage:` prefix) so they share a vector space with `query:`-embedded ingredient strings:

- **At runtime:** after a provisional is enriched to `confirmed`, the enriching device computes its `passage: <canonical en>` embedding on-device and writes it locally plus best-effort `PATCH /api/ingredients/[id]` (write-once — the server only sets the column when it is still null). Gated behind model consent; silently skipped otherwise.
- **Backfill:** `bun scripts/backfill-embeddings.ts` runs e5 in Node over every confirmed row missing an embedding and writes the vector directly via Drizzle. Mechanical and deterministic (no AI). Required so pre-existing rows — which no client will ever re-enrich — gain vectors. `bun scripts/test-vocab-coverage.ts` checks Fuse/token match quality (it does not touch embeddings).

---

## Signed-in vs anonymous

| Capability | Anonymous | Signed in |
|---|---|---|
| Vocabulary in Dexie (Fuse matching) | ✓ — pulled on startup via public `GET /api/ingredients` | ✓ delta-synced via the same route |
| Embedding matching | ✓ (after model consent) — embeddings ride along in the vocab rows | ✓ |
| Provisional creation (local) | ✓ | ✓ |
| Provisional upsert to server | ✗ | ✓ |
| AI enrichment + embedding contribution | ✗ | ✓ (and stuck provisionals retry on login) |

The vocab pull runs for everyone on startup (`useVocabSync` in `client-shell`), so anonymous users get both Fuse and embedding matching against the full confirmed vocabulary. What they still miss is server-side persistence of the provisionals they create and AI enrichment of new entries — those stay login-gated. The full rationale is in [Local Storage & Sync](local-storage-and-sync.md#ingredient-vocabulary-stays-local-for-anonymous-users).
