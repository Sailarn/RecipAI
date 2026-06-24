import { sql } from "drizzle-orm";
import { db } from "@/db";

// Match thresholds — calibrated for Xenova/multilingual-e5-small from a labeled
// probe sweep (scripts/local/admin/calibrate). The vocab is embedded on the EN
// `en` field, so this matcher's real job is English items Fuse missed on
// modifiers ("small zucchini" 0.89, "boneless skinless chicken breast" 0.89);
// Cyrillic stays Fuse's job via UA aliases (cross-lingual sims are unreliable —
// "кабачок"→cabbage-red 0.83). Same-language correct matches cluster ≥0.89
// (median 0.93); generic "should-reject" queries top out at 0.875 ("fresh
// herbs"→turmeric-fresh) — so 0.88 cleanly separates them. The old 0.08 gap
// wrongly rejected correct matches with a close sibling (tomato/tomato-cherry
// 0.027, bell-pepper-red/green 0.046); 0.02 sits below the smallest correct gap
// (0.022) so it only declines genuine dead-heats.
const SIMILARITY_THRESHOLD = 0.88;
const SIMILARITY_GAP = 0.02;

export type Neighbor = { id: string; sim: number };

// Pick the closest vocab entry, but only when the top match is both strong
// enough and clearly ahead of the runner-up; otherwise null so the caller
// falls back to a provisional.
export function pickMatchFromNeighbors(neighbors: Neighbor[]): string | null {
  if (neighbors.length === 0) return null;
  const best = neighbors[0];
  const second = neighbors[1]?.sim ?? 0;
  if (best.sim >= SIMILARITY_THRESHOLD && best.sim - second >= SIMILARITY_GAP) {
    return best.id;
  }
  return null;
}

// pgvector cosine distance: `<=>` returns 1 - cosine_sim for vector_cosine_ops.
// We fetch the top-2 confirmed neighbors so pickMatchFromNeighbors can apply
// the runner-up gap. 399 rows -> exact scan, no ANN index needed.
export async function nearestVocab(
  queryEmbedding: number[],
): Promise<string | null> {
  const literal = `[${queryEmbedding.join(",")}]`;
  const rows = await db.execute<{ id: string; sim: number }>(sql`
    SELECT id, 1 - (embedding <=> ${literal}::vector) AS sim
    FROM ingredients
    WHERE status = 'confirmed' AND embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT 2
  `);
  const neighbors = Array.from(rows).map((row) => ({
    id: row.id,
    sim: Number(row.sim),
  }));
  return pickMatchFromNeighbors(neighbors);
}
