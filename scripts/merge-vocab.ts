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

if (files.length === 0) {
  console.error(`No JSON files found in ${VOCAB_DIR}/`);
  process.exit(1);
}

const all: VocabEntry[] = [];
const seenIds = new Map<string, string>(); // id → source file
const errors: string[] = [];

for (const file of files) {
  const path = join(VOCAB_DIR, file);
  const entries = (await Bun.file(path).json()) as VocabEntry[];

  console.log(`${file}: ${entries.length} entries`);

  for (const entry of entries) {
    if (!entry.id || !entry.en || !entry.ua || !entry.category) {
      errors.push(
        `${file}: missing required field in entry ${JSON.stringify(entry).slice(0, 60)}`,
      );
      continue;
    }

    if (seenIds.has(entry.id)) {
      errors.push(
        `Duplicate id "${entry.id}" — in ${seenIds.get(entry.id)} and ${file}`,
      );
      continue;
    }

    seenIds.set(entry.id, file);
    all.push(entry);
  }
}

if (errors.length > 0) {
  console.error("\nErrors found:");
  for (const e of errors) console.error(" ", e);
  console.error("\nFix errors before seeding.");
  process.exit(1);
}

all.sort(
  (a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id),
);

await Bun.write("scripts/ingredients-seed.json", JSON.stringify(all, null, 2));

console.log(
  `\nTotal: ${all.length} entries across ${files.length} group files`,
);
console.log("Written → scripts/ingredients-seed.json");

process.exit(0);
