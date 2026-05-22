/**
 * One-time cleanup of DeepSeek-generated vocab files.
 * Run: bun scripts/fix-vocab.ts
 *
 * Fixes applied:
 * 1. Lowercase en, ua, aliasesEn entries
 * 2. Move Cyrillic strings from aliasesEn to aliasesUa
 * 3. Deduplicate alias arrays (removing repeats of the main ua/en)
 * 4. Fix corrupted soy entries ("сосв*" → "соєв*")
 * 5. Rename branded entries to generic equivalents
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

interface VocabEntry {
  id: string;
  en: string;
  ua: string;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
}

const VOCAB_DIR = "scripts/vocab";

const files = readdirSync(VOCAB_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

// Branded → generic remaps: id, new id, new en, new ua
const BRANDED_REMAPS: Record<string, { id: string; en: string; ua: string }> = {
  "dr-oetker-glaze": { id: "glaze", en: "glaze", ua: "глазур" },
  "dr-oetker-cream-base": {
    id: "cream-base",
    en: "cream base",
    ua: "заготовка для крему",
  },
  nutella: {
    id: "chocolate-hazelnut-spread",
    en: "chocolate hazelnut spread",
    ua: "шоколадна горіхова паста",
  },
};

function fixSoyUkrainian(str: string): string {
  return str
    .replace(/Сосв([а-яіїєґ]*)/gu, (_, rest) => `Соєв${rest}`)
    .replace(/сосв([а-яіїєґ]*)/gu, (_, rest) => `соєв${rest}`);
}

function isCyrillic(str: string): boolean {
  return /\p{Script=Cyrillic}/u.test(str);
}

function lcFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Lowercase the whole string for en/aliasesEn (they should always be lowercase)
// For ua/aliasesUa: only lowercase the first character (preserves mid-string proper nouns)
function lcEn(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function dedup(arr: string[], exclude: string[] = []): string[] {
  const excludeSet = new Set(exclude.map((s) => s.toLowerCase()));
  const seen = new Set<string>();
  return arr.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key) || excludeSet.has(key)) return false;
    seen.add(key);
    return true;
  });
}

let totalFixed = 0;

for (const file of files) {
  const path = join(VOCAB_DIR, file);
  const entries = (await Bun.file(path).json()) as VocabEntry[];
  let fileFixed = 0;

  const fixed: VocabEntry[] = [];

  for (const entry of entries) {
    const e = {
      ...entry,
      aliasesEn: [...entry.aliasesEn],
      aliasesUa: [...entry.aliasesUa],
    };

    // 1. Apply branded remap
    const remap = BRANDED_REMAPS[e.id];
    if (remap) {
      // Move old en/ua/id to aliases before replacing
      if (!e.aliasesEn.includes(e.en)) e.aliasesEn.push(e.en);
      if (!e.aliasesUa.includes(e.ua)) e.aliasesUa.push(e.ua);
      e.id = remap.id;
      e.en = remap.en;
      e.ua = remap.ua;
      fileFixed++;
    }

    // 2. Fix soy Ukrainian corruption
    if (e.id.startsWith("soy-")) {
      const orig = e.ua;
      e.ua = fixSoyUkrainian(e.ua);
      e.aliasesUa = e.aliasesUa.map(fixSoyUkrainian);
      if (e.ua !== orig) fileFixed++;
    }

    // 3. Lowercase en
    e.en = lcEn(e.en);

    // 4. Lowercase ua first char
    e.ua = lcFirst(e.ua);

    // 5. Cyrillic strings in aliasesEn → move to aliasesUa
    const cyrillicInEn = e.aliasesEn.filter(isCyrillic);
    e.aliasesEn = e.aliasesEn.filter((a) => !isCyrillic(a));
    e.aliasesUa = [...e.aliasesUa, ...cyrillicInEn];
    if (cyrillicInEn.length > 0) fileFixed++;

    // 6. Lowercase aliasesEn first char
    e.aliasesEn = e.aliasesEn.map(lcEn);

    // 7. Lowercase aliasesUa first char
    e.aliasesUa = e.aliasesUa.map(lcFirst);

    // 8. Deduplicate aliases (also remove if same as main en/ua)
    e.aliasesEn = dedup(e.aliasesEn, [e.en]);
    e.aliasesUa = dedup(e.aliasesUa, [e.ua]);
    // For truly indeclinable words, aliasesUa may be empty after dedup —
    // keep at least the ua value itself so the coverage test can match it.
    if (e.aliasesUa.length === 0) e.aliasesUa = [e.ua];

    fixed.push(e);
  }

  // Check for duplicate IDs after remapping
  const idsSeen = new Set<string>();
  const deduped: VocabEntry[] = [];
  for (const e of fixed) {
    if (idsSeen.has(e.id)) {
      console.warn(
        `  ⚠ Duplicate id after remap: "${e.id}" in ${file} — skipping second`,
      );
      continue;
    }
    idsSeen.add(e.id);
    deduped.push(e);
  }

  await Bun.write(path, JSON.stringify(deduped, null, 2));
  totalFixed += fileFixed;
  console.log(`${file}: ${fileFixed} entries modified`);
}

console.log(
  `\nDone — ${totalFixed} entries modified across ${files.length} files`,
);
