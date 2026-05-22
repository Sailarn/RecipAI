import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { pipeline } from "@huggingface/transformers";

interface SeedEntry {
  id: string;
  en: string;
  ua: string;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
}

interface VocabEmbedding {
  id: string;
  embedding: number[];
}

const BATCH_SIZE = 32;

const data = (await Bun.file(
  "scripts/ingredients-seed.json",
).json()) as SeedEntry[];

console.log(`Loaded ${data.length} entries from ingredients-seed.json`);
console.log("Loading Xenova/multilingual-e5-small model...");

const extractor = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
);

console.log("Model loaded. Computing embeddings...");

const results: VocabEmbedding[] = [];
const totalBatches = Math.ceil(data.length / BATCH_SIZE);

for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

  for (const entry of batch) {
    const output = await extractor(`passage: ${entry.en}`, {
      pooling: "mean",
      normalize: true,
    });
    const embedding = Array.from(output.data as Float32Array);
    results.push({ id: entry.id, embedding });
  }

  console.log(`  Batch ${batchIndex} / ${totalBatches} done`);
}

await Bun.write(
  "public/vocab-embeddings.json",
  JSON.stringify(results, null, 2),
);

console.log(
  `Done! Written ${results.length} embeddings to public/vocab-embeddings.json`,
);
process.exit(0);
