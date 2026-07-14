import type { RecipeSection } from "./schema";

/**
 * Group order-agnostic items (ingredients) by catalog order, coalescing every
 * member of a section into a single group and putting ungrouped or unknown
 * items last. Tolerates arrays whose section members are interleaved — since
 * ingredient order carries no meaning, pulling them together is desirable.
 * Steps must NOT use this (see `groupBySectionRuns`): their order is a cooking
 * sequence and reordering it into buckets would scramble the recipe.
 */
export function groupBySectionId<T extends { sectionId?: string | null }>(
  items: T[],
  sections: RecipeSection[] | undefined,
): { sectionId: string | null; items: T[] }[] {
  const orderedSections = [...(sections ?? [])].sort(
    (left, right) => left.order - right.order,
  );
  const knownSectionIds = new Set(orderedSections.map((section) => section.id));
  const itemsBySectionId = new Map<string, T[]>();
  const ungroupedItems: T[] = [];

  for (const item of items) {
    const sectionId = item.sectionId;
    if (!sectionId || !knownSectionIds.has(sectionId)) {
      ungroupedItems.push(item);
      continue;
    }
    const sectionItems = itemsBySectionId.get(sectionId) ?? [];
    sectionItems.push(item);
    itemsBySectionId.set(sectionId, sectionItems);
  }

  const groups = orderedSections.flatMap((section) => {
    const sectionItems = itemsBySectionId.get(section.id);
    return sectionItems ? [{ sectionId: section.id, items: sectionItems }] : [];
  });

  return ungroupedItems.length
    ? [...groups, { sectionId: null, items: ungroupedItems }]
    : groups;
}

/**
 * Group order-sensitive items (steps) into consecutive runs sharing a
 * `sectionId`, preserving array order — never reorders. A section that recurs
 * later starts a fresh run, which is correct for steps: the cook genuinely
 * returns to that section's work at that point in the sequence.
 */
export function groupBySectionRuns<T extends { sectionId?: string | null }>(
  items: T[],
): { sectionId: string | null; items: T[] }[] {
  const groups: { sectionId: string | null; items: T[] }[] = [];
  for (const item of items) {
    const sectionId = item.sectionId ?? null;
    const last = groups.at(-1);
    if (last && last.sectionId === sectionId) last.items.push(item);
    else groups.push({ sectionId, items: [item] });
  }
  return groups;
}

/** Resolve a `sectionId` to its display name via the recipe's `sections` list. */
export function sectionName(
  sectionId: string | null,
  sections: RecipeSection[] | undefined,
): string | null {
  if (!sectionId) return null;
  return sections?.find((section) => section.id === sectionId)?.name ?? null;
}

/** Only show section headers when the recipe genuinely has more than one. */
export function shouldShowSections(
  sectionIds: Array<string | null | undefined>,
): boolean {
  return new Set(sectionIds.map((sectionId) => sectionId ?? null)).size > 1;
}
