import type { RecipeSection } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

export interface BuiltSections {
  sections: RecipeSection[];
  sectionIdByLabel: Map<string, string>;
}

/**
 * Turn free-form section labels (as emitted by the parse prompts, or read off
 * a legacy recipe) into a structured `RecipeSection[]` plus a label -> id
 * lookup. Distinct labels become sections in first-appearance order,
 * scanning ingredients before steps so "For the dough" gets the same id
 * whichever list mentions it first. Null/empty labels are ignored.
 */
export function buildSectionsFromLabels(
  ingredientLabels: Array<string | null | undefined>,
  stepLabels: Array<string | null | undefined>,
  nextId: () => string = generateId,
): BuiltSections {
  const sections: RecipeSection[] = [];
  const sectionIdByLabel = new Map<string, string>();

  for (const label of [...ingredientLabels, ...stepLabels]) {
    const trimmed = label?.trim();
    if (!trimmed || sectionIdByLabel.has(trimmed)) continue;
    const id = nextId();
    sectionIdByLabel.set(trimmed, id);
    sections.push({ id, name: trimmed, order: sections.length });
  }

  return { sections, sectionIdByLabel };
}

/** Resolve a label to its built section id, or null when absent/unknown. */
export function sectionIdForLabel(
  label: string | null | undefined,
  sectionIdByLabel: Map<string, string>,
): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  return sectionIdByLabel.get(trimmed) ?? null;
}
