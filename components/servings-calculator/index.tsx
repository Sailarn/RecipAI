"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import type { Ingredient } from "@/lib/db/schema";

interface ServingsCalculatorProps {
  originalServings: number;
  ingredients: Ingredient[];
}

export function ServingsCalculator({
  originalServings,
  ingredients,
}: ServingsCalculatorProps) {
  const [servings, setServings] = useState(originalServings);

  const ratio = servings / originalServings;

  const formatAmount = (amount?: number) => {
    if (!amount) return null;
    const scaled = amount * ratio;
    if (Number.isInteger(scaled)) return String(scaled);
    return scaled.toFixed(1).replace(/\.0$/, "");
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium">Servings</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <MinusIcon className="w-3 h-3" />
          </button>
          <span className="text-sm font-semibold w-6 text-center">
            {servings}
          </span>
          <button
            type="button"
            onClick={() => setServings((s) => s + 1)}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      <ul className="space-y-1">
        {ingredients.map((ing) => (
          <li key={ing.id} className="flex gap-2 text-sm">
            <span className="text-muted-foreground">•</span>
            <span>
              {formatAmount(ing.amount) && (
                <span className="font-medium">{formatAmount(ing.amount)} </span>
              )}
              {ing.unit && <span>{ing.unit} </span>}
              {ing.item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
