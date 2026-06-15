import Fuse from "fuse.js";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";

const FUSE_THRESHOLD = 0.2;

let fuseCache: {
  index: Fuse<{ id: string; text: string }>;
  size: number;
} | null = null;

async function getFuseIndex(): Promise<Fuse<{ id: string; text: string }>> {
  const vocab = await db.ingredients
    .filter(
      (ingredient) =>
        !ingredient.status || ingredient.status === INGREDIENT_STATUS.CONFIRMED,
    )
    .toArray();
  if (fuseCache && fuseCache.size === vocab.length) return fuseCache.index;
  const items = vocab.flatMap((vocabEntry) => [
    { id: vocabEntry.id, text: vocabEntry.en },
    ...(vocabEntry.ua ? [{ id: vocabEntry.id, text: vocabEntry.ua }] : []),
    ...vocabEntry.aliasesEn.map((alias) => ({
      id: vocabEntry.id,
      text: alias,
    })),
    ...vocabEntry.aliasesUa.map((alias) => ({
      id: vocabEntry.id,
      text: alias,
    })),
  ]);
  const index = new Fuse(items, {
    keys: ["text"],
    threshold: FUSE_THRESHOLD,
    includeScore: true,
  });
  fuseCache = { index, size: vocab.length };
  return index;
}

function preprocessIngredient(text: string): string {
  return text
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// When multiple fuse hits tie on score, pick the slug id (e.g. "salt",
// "black-pepper") over a UUID provisional. UUIDs start with 8 lowercase hex
// chars followed by a hyphen; anything else is treated as a slug.
function pickBestId(
  results: Array<{ item: { id: string; text: string }; score?: number }>,
): string {
  if (results.length === 1) return results[0].item.id;
  const bestScore = results[0].score ?? 0;
  const tied = results.filter((result) => (result.score ?? 0) === bestScore);
  const slugHit = tied.find((result) => !/^[0-9a-f]{8}-/.test(result.item.id));
  return (slugHit ?? tied[0]).item.id;
}

function fuseHit(
  fuse: Fuse<{ id: string; text: string }>,
  text: string,
): string | null {
  const preprocessed = preprocessIngredient(text);

  // Try the full preprocessed text first
  const full = fuse.search(preprocessed);
  if (full.length > 0) return pickBestId(full);

  // Fall back to individual token search — handles multi-word phrases like
  // "кетчупу Торчин для дітей" → token "кетчупу" → ketchup.
  // Guard: only accept when the matched alias is ≤ 2 words, so a common word
  // like "власному" doesn't hit a long alias phrase.
  const tokens = preprocessed
    .split(/\s+/)
    .map((token) => token.replace(/[.,]/g, ""))
    .filter((token) => token.length > 3);
  for (const token of tokens) {
    const fuseResults = fuse.search(token);
    if (
      fuseResults.length > 0 &&
      fuseResults[0].item.text.trim().split(/\s+/).length <= 2
    ) {
      return pickBestId(fuseResults);
    }
  }

  return null;
}

// Resolve raw ingredient text to a confirmed-vocab canonical id via fuzzy
// match across en/ua names and aliases, or null when nothing matches. This is
// the cross-language bridge: "flour" and "борошно" both resolve to the same id.
// Read-only and synchronous-fast (cached in-memory index) — safe to call from
// the pantry add path and per-ingredient UI.
export async function matchVocabId(
  text: string,
  ua?: string | null,
): Promise<string | null> {
  const fuse = await getFuseIndex();
  return fuseHit(fuse, text) ?? (ua ? fuseHit(fuse, ua) : null);
}
