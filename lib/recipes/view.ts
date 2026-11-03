import type { recipes } from "@/db/schema/recipes";
import type { RecipeIngredient, RecipeSection, Step } from "@/lib/db/schema";

export type RecipeRow = typeof recipes.$inferSelect;

/** Recipe page in the app. Locale-less: next-intl redirects to the user's locale. */
export function recipeAppUrl(origin: string, id: string): string {
  return `${origin}/recipes/${encodeURIComponent(id)}`;
}

export interface RecipeSummaryView {
  id: string;
  title: string;
  category: string | null;
  servings: number | null;
  totalTimeMinutes: number | null;
  tried: boolean;
  updatedAt: string;
  url: string;
}

export interface RecipeIngredientView {
  item: string;
  amount?: number;
  unit?: string;
  modifiers?: string[];
  section?: string;
}

export interface RecipeStepView {
  step: number;
  instruction: string;
  section?: string;
  imageUrl?: string;
}

export interface RecipeView extends RecipeSummaryView {
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  collections: Array<{ id: string; name: string }>;
  ingredients: RecipeIngredientView[];
  instructions: RecipeStepView[];
  createdAt: string;
}

type SummaryRow = Pick<
  RecipeRow,
  | "id"
  | "title"
  | "category"
  | "servings"
  | "totalTime"
  | "status"
  | "updatedAt"
>;

export function toRecipeSummaryView(
  row: SummaryRow,
  origin: string,
): RecipeSummaryView {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? null,
    servings: row.servings ?? null,
    totalTimeMinutes: row.totalTime ?? null,
    tried: row.status === "tried",
    updatedAt: row.updatedAt.toISOString(),
    url: recipeAppUrl(origin, row.id),
  };
}

function sectionNames(row: RecipeRow): Map<string, string> {
  const sections = (row.sections ?? []) as RecipeSection[];
  return new Map(sections.map((section) => [section.id, section.name]));
}

function withSection<T extends object>(
  view: T,
  sectionId: string | null | undefined,
  names: Map<string, string>,
): T & { section?: string } {
  const section = sectionId ? names.get(sectionId) : undefined;
  return section ? { ...view, section } : view;
}

/**
 * The shape AI clients see for one recipe: human-meaningful fields only.
 * Internal ids (ingredient/step/section ids, vocabulary ids, image crop data)
 * stay out — sections are inlined as names, steps are numbered.
 */
export function toRecipeView(
  row: RecipeRow,
  origin: string,
  collectionNames: Map<string, string> = new Map(),
): RecipeView {
  const names = sectionNames(row);
  const ingredients = (row.ingredients ?? []) as RecipeIngredient[];
  const steps = [...((row.instructions ?? []) as Step[])].sort(
    (a, b) => a.order - b.order,
  );
  const collectionIds = (row.collectionIds ?? []) as string[];

  return {
    ...toRecipeSummaryView(row, origin),
    description: row.description ?? null,
    prepTimeMinutes: row.prepTime ?? null,
    cookTimeMinutes: row.cookTime ?? null,
    sourceUrl: row.sourceUrl ?? null,
    imageUrl: row.imageUrl ?? null,
    isPublic: row.isPublic,
    collections: collectionIds.flatMap((id) => {
      const name = collectionNames.get(id);
      return name ? [{ id, name }] : [];
    }),
    ingredients: ingredients.map((ingredient) =>
      withSection(
        {
          item: ingredient.item,
          ...(ingredient.amount != null ? { amount: ingredient.amount } : {}),
          ...(ingredient.unit ? { unit: ingredient.unit } : {}),
          ...(ingredient.modifiers?.length
            ? { modifiers: ingredient.modifiers }
            : {}),
        },
        ingredient.sectionId,
        names,
      ),
    ),
    instructions: steps.map((step, index) =>
      withSection(
        {
          step: index + 1,
          instruction: step.instruction,
          ...(step.imageUrl ? { imageUrl: step.imageUrl } : {}),
        },
        step.sectionId,
        names,
      ),
    ),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Plain-text rendering, used where a client wants a document (ChatGPT `fetch`). */
export function recipeAsText(view: RecipeView): string {
  const lines = [`# ${view.title}`];
  if (view.description) lines.push("", view.description);
  const facts = [
    view.category && `Category: ${view.category}`,
    view.servings && `Servings: ${view.servings}`,
    view.prepTimeMinutes && `Prep: ${view.prepTimeMinutes} min`,
    view.cookTimeMinutes && `Cook: ${view.cookTimeMinutes} min`,
  ].filter(Boolean);
  if (facts.length) lines.push("", facts.join(" · "));

  lines.push("", "## Ingredients");
  let section: string | undefined;
  for (const ingredient of view.ingredients) {
    if (ingredient.section !== section) {
      section = ingredient.section;
      if (section) lines.push(`### ${section}`);
    }
    const quantity = [ingredient.amount, ingredient.unit]
      .filter((part) => part != null && part !== "")
      .join(" ");
    const modifiers = ingredient.modifiers?.length
      ? ` (${ingredient.modifiers.join(", ")})`
      : "";
    lines.push(
      `- ${quantity ? `${quantity} ` : ""}${ingredient.item}${modifiers}`,
    );
  }

  lines.push("", "## Steps");
  section = undefined;
  for (const step of view.instructions) {
    if (step.section !== section) {
      section = step.section;
      if (section) lines.push(`### ${section}`);
    }
    lines.push(`${step.step}. ${step.instruction}`);
  }

  if (view.sourceUrl) lines.push("", `Source: ${view.sourceUrl}`);
  return lines.join("\n");
}
