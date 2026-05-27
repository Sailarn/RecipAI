import type { ParsedIngredient } from "@/lib/db/schema";

const MAX_VISIBLE_INGREDIENTS = 4;

interface IngredientsPreviewProps {
  ingredients: ParsedIngredient[];
}

export function IngredientsPreview({ ingredients }: IngredientsPreviewProps) {
  if (ingredients.length === 0) return null;

  const visible = ingredients.slice(0, MAX_VISIBLE_INGREDIENTS);
  const remaining = ingredients.length - MAX_VISIBLE_INGREDIENTS;

  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-[var(--fg-3)] uppercase tracking-[0.06em] mb-[6px]">
        Ingredients ({ingredients.length})
      </p>
      <ul className="flex flex-col gap-[2px]">
        {visible.map((ingredient) => (
          <li
            key={`${ingredient.item}-${ingredient.amount}-${ingredient.unit}`}
            className="flex gap-[6px] items-baseline text-[12px] text-[var(--fg-1)]"
          >
            <span className="text-[var(--food-accent)] text-[6px] mt-[2px]">
              ●
            </span>
            <span>
              {ingredient.amount && `${ingredient.amount} `}
              {ingredient.unit && `${ingredient.unit} `}
              {ingredient.item}
            </span>
          </li>
        ))}
        {remaining > 0 && (
          <li className="text-[11px] text-[var(--fg-3)]">+{remaining} more</li>
        )}
      </ul>
    </div>
  );
}
