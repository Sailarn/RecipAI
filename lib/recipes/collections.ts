import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { recipes } from "@/db/schema/recipes";

// Owner-scoped collection access for the AI connector.

export interface CollectionView {
  id: string;
  name: string;
  emoji: string;
  recipeCount: number;
}

export const DEFAULT_COLLECTION_EMOJI = "⭐";

export async function listCollections(
  userId: string,
): Promise<CollectionView[]> {
  const [rows, memberships] = await Promise.all([
    db
      .select({
        id: collections.id,
        name: collections.name,
        emoji: collections.emoji,
      })
      .from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(asc(collections.createdAt)),
    db
      .select({ collectionIds: recipes.collectionIds })
      .from(recipes)
      .where(eq(recipes.userId, userId)),
  ]);

  const counts = new Map<string, number>();
  for (const { collectionIds } of memberships) {
    for (const id of (collectionIds ?? []) as string[]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return rows.map((row) => ({ ...row, recipeCount: counts.get(row.id) ?? 0 }));
}

export async function createCollection(
  userId: string,
  name: string,
  emoji: string = DEFAULT_COLLECTION_EMOJI,
): Promise<CollectionView> {
  const existing = await db
    .select({
      id: collections.id,
      name: collections.name,
      emoji: collections.emoji,
    })
    .from(collections)
    .where(
      and(
        eq(collections.userId, userId),
        sql`lower(${collections.name}) = lower(${name})`,
      ),
    )
    .limit(1);
  if (existing[0]) {
    const [current] = (await listCollections(userId)).filter(
      (collection) => collection.id === existing[0].id,
    );
    return current ?? { ...existing[0], recipeCount: 0 };
  }

  const now = new Date();
  const collection = {
    id: crypto.randomUUID(),
    userId,
    name,
    emoji,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(collections).values(collection);
  return { id: collection.id, name, emoji, recipeCount: 0 };
}

export type MembershipResult =
  | { ok: true; collectionIds: string[] }
  | { ok: false; missing: "recipe" | "collection" };

/** Add a recipe to, or remove it from, one of the user's collections. */
export async function setCollectionMembership(
  userId: string,
  recipeId: string,
  collectionId: string,
  member: boolean,
): Promise<MembershipResult> {
  const [collection] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(eq(collections.id, collectionId), eq(collections.userId, userId)),
    )
    .limit(1);
  if (!collection) return { ok: false, missing: "collection" };

  const [recipe] = await db
    .select({ collectionIds: recipes.collectionIds })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .limit(1);
  if (!recipe) return { ok: false, missing: "recipe" };

  const current = (recipe.collectionIds ?? []) as string[];
  const next = member
    ? [...new Set([...current, collectionId])]
    : current.filter((id) => id !== collectionId);

  if (next.length !== current.length) {
    await db
      .update(recipes)
      .set({ collectionIds: next, updatedAt: new Date() })
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)));
  }
  return { ok: true, collectionIds: next };
}
