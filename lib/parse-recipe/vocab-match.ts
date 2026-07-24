import Fuse from "fuse.js";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";

const FUSE_THRESHOLD = 0.2;

type VocabIndex = {
  index: Fuse<{ id: string; text: string }>;
  items: Array<{ id: string; text: string }>;
};

let fuseCache: (VocabIndex & { size: number }) | null = null;

async function getFuseIndex(): Promise<VocabIndex> {
  const vocab = await db.ingredients
    .filter(
      (ingredient) =>
        !ingredient.status || ingredient.status === INGREDIENT_STATUS.CONFIRMED,
    )
    .toArray();
  if (fuseCache && fuseCache.size === vocab.length) return fuseCache;
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
  fuseCache = { index, items, size: vocab.length };
  return fuseCache;
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

function escapeRegExpChars(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Exact whole-word/phrase containment beats fuzzy scoring outright: if the
// ingredient text literally contains a vocab name/alias as a whole word or
// phrase, that entry wins with no Fuse search involved. This prevents a
// modifier word from outscoring the real noun purely because Fuse compares
// tokens independently — "white onion" fuzzy-matching alias "white flour" as
// readily as it matches "onion" itself, just because the modifier comes
// first. Boundaries use \p{L}/\p{N} (not \b, which is ASCII-only and doesn't
// bound Cyrillic phrases at all) so "egg" can't match inside "eggplant".
// Prefers the LONGEST matching name so a short generic alias ("cream") can't
// shadow a more specific one that also matches ("heavy cream"); on a tie,
// prefers the slug id over a uuid provisional, same as pickBestId.
function exactNameMatch(
  text: string,
  items: Array<{ id: string; text: string }>,
): string | null {
  const lower = text.toLowerCase();
  const matches: Array<{ id: string; length: number }> = [];
  for (const item of items) {
    const name = item.text.trim().toLowerCase();
    if (!name) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExpChars(name)}(?![\\p{L}\\p{N}])`,
      "u",
    );
    if (pattern.test(lower)) matches.push({ id: item.id, length: name.length });
  }
  if (matches.length === 0) return null;
  const maxLength = Math.max(...matches.map((match) => match.length));
  const longest = matches.filter((match) => match.length === maxLength);
  const slugMatch = longest.find((match) => !/^[0-9a-f]{8}-/.test(match.id));
  return (slugMatch ?? longest[0]).id;
}

function fuseHit(vocabIndex: VocabIndex, text: string): string | null {
  const preprocessed = preprocessIngredient(text);

  const exactMatch = exactNameMatch(preprocessed, vocabIndex.items);
  if (exactMatch) return exactMatch;

  // Try the full preprocessed text first
  const full = vocabIndex.index.search(preprocessed);
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
    const fuseResults = vocabIndex.index.search(token);
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
// `en` is the AI's normalized English head ("shredded mozzarella" -> "mozzarella")
// and is tried first — it sidesteps modifier dilution and cross-lingual noise.
// Read-only and synchronous-fast (cached in-memory index) — safe to call from
// the pantry add path and per-ingredient UI.
export async function matchVocabId(
  text: string,
  ua?: string | null,
  en?: string | null,
): Promise<string | null> {
  const vocabIndex = await getFuseIndex();
  return (
    (en ? fuseHit(vocabIndex, en) : null) ??
    fuseHit(vocabIndex, text) ??
    (ua ? fuseHit(vocabIndex, ua) : null)
  );
}
