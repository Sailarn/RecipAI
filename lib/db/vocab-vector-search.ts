import { sql } from "drizzle-orm";
import { db } from "@/db";

// Match thresholds — carried over verbatim from the former on-device matcher.
const SIMILARITY_THRESHOLD = 0.82;
const SIMILARITY_GAP = 0.08;

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
