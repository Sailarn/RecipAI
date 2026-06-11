# Parse Pipeline

How RecipAI turns a URL or photo into a structured recipe.

---

## Overview

There are three entry paths:

```mermaid
graph TD
    A[User pastes URL] --> B{Video URL?}
    B -->|Yes - Instagram| C[Video pipeline]
    B -->|No| D[Web pipeline]
    E[User uploads photo] --> F[Photo pipeline]

    C --> G[Parse job in Supabase]
    D --> G
    G --> H[ParsedRecipe saved to Dexie]
    F --> H
```

---

## Web pipeline (`lib/parse-recipe/web.ts`)

```mermaid
graph LR
    A[Fetch HTML] --> B{PhantomJsCloud}
    B -->|fail| C[scrape.do fallback]
    B -->|ok| D[Schema.org extract]
    C --> D
    D -->|found + has ingredients| E[Done - no AI needed]
    D -->|not found| F[Strip script/style/svg]
    F --> G[Extract images]
    G --> H[trimChrome]
    H --> I{Enough text left?}
    I -->|yes| J[Send trimmed text]
    I -->|no - safety floor| K[Send full text]
    J --> L[AI model chain]
    K --> L
    L --> M[ParsedRecipe]
```

**HTML trimming (`trimChrome`):** walks every `ul`, `ol`, `nav`, `header`, `footer`, and `div`. Blocks larger than 200 chars where more than 60% of the text is link text are removed as site chrome (menus, footers). A safety floor prevents gutting pages where the recipe content itself is link-dense: if the trimmed result is less than 300 chars or less than 10% of the original, the full text is used instead.

**Text limit:** the final text is sliced to 25,000 characters before being sent to the AI.

---

## Video pipeline (`lib/parse-recipe/video.ts`)

Currently supports **Instagram Reels only**.

```mermaid
graph LR
    A[Instagram URL] --> B[Apify - download reel]
    B --> C[Fetch video buffer]
    C --> D[Groq Whisper transcription]
    D -->|transcript too short| E[Use caption only]
    D -->|ok| F[Build transcript prompt]
    E --> F
    F --> G[AI model chain]
    G --> H[ParsedRecipe]
```

Requires `GROQ_API_KEY`. If transcript is under 30 characters and no caption is available, parsing fails.

---

## Photo pipeline (`app/api/parse-recipe/photo/route.ts`)

Photos bypass the job queue entirely — parsing is synchronous.

```mermaid
graph LR
    A[Client compresses image] --> B[POST /api/parse-recipe/photo]
    B --> C[Rate limit check]
    C -->|ok| D[Build photo prompt]
    D --> E[AI model chain - multimodal]
    E --> F[ParsedRecipe]
    F --> G[Saved to Dexie locally]
```

The image is sent as a base64-encoded string alongside a text prompt. Both Gemini (via `inlineData`) and OpenAI (via `image_url` with a data URI) support this format. Photo history is recorded locally in Dexie `parseHistory` without a `url` field.

---

## AI model chain (`lib/ai.ts`)

All three pipelines funnel through the same model chain in `lib/ai.ts` (via the `callAiForRecipe` / `callAiForRecipePhoto` wrappers):

```mermaid
graph LR
    A[generateJson] --> B[gemini-2.5-flash]
    B -->|fail| C[gemini-2.0-flash]
    C -->|fail| D[gemini-2.5-flash-lite]
    D -->|fail| E{OPENAI_API_KEY set?}
    E -->|yes| F[gpt-4o-mini]
    E -->|no| G[Throw last error]
    F -->|fail| G
    B -->|ok| H[ParsedRecipe]
    C -->|ok| H
    D -->|ok| H
    F -->|ok| H
```

All Gemini models use `responseMimeType: "application/json"`. OpenAI uses `response_format: { type: "json_object" }`. The OpenAI fallback is only active when `OPENAI_API_KEY` is set — without it the chain ends at `gemini-2.5-flash-lite`.

---

## Parse queue (`app/api/parse-queue/`)

URL and video parses go through a job queue backed by Supabase `parse_jobs`.

```mermaid
sequenceDiagram
    participant Client
    participant Queue as POST /parse-queue
    participant Process as POST /parse-queue/process
    participant Poll as GET /parse-queue/[id]

    Client->>Queue: { url, userComment }
    Queue->>Queue: Rate limit check
    Queue-->>Client: { jobId, uploadToken }
    Client->>Process: { jobId } (fire-and-forget)
    Client->>Poll: polling every 3s
    Process->>Process: Idempotency check (skip if done/in-flight)
    Process->>Process: Parse recipe
    Process-->>Poll: status: done, result: ParsedRecipe
    Poll-->>Client: recipe ready
```

**Idempotency:** if a job's `updatedAt` is less than 90 seconds old and its status is `processing`, a new `process` call is silently skipped. This prevents duplicate AI calls from repeated requests.

**Anonymous jobs:** jobs created without a session have `user_id = null`. On login, `POST /api/parse-queue/claim` adopts them into the user's account so they appear in the server-side history.

---

## Rate limiting (`lib/rate-limit.ts`)

AI parse requests (both URL and photo) share a single Redis fixed-window counter per caller:

| Caller | Limit |
|---|---|
| Anonymous (by IP) | 15 requests / hour |
| Signed-in (by user id) | 60 requests / hour |

The counter uses Redis `INCR` + `EXPIRE`. Rate limiting **fails open** — if Redis is unreachable the request proceeds and the error is captured by Sentry.

---

## Parse history (`lib/db/parse-history.ts`)

Every finished parse (done or failed) is recorded locally in Dexie `parseHistory`. The table is capped at 100 entries (oldest pruned). On login, the client syncs its local history with the server via the claim + pull flow in `useSyncOnLogin`.

---

## After parsing: ingredient normalization

A `ParsedRecipe` is not the end of the line — when it is saved, every ingredient string is matched against the canonical vocabulary (fuzzy match → on-device embeddings → provisional creation + AI enrichment) to populate `canonicalIngredientIds`. That pipeline has its own page: [Ingredient Vocabulary](ingredient-vocabulary.md).
