"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ParsedRecipe } from "../page";

interface ParseResultProps {
  result: ParsedRecipe;
  onSave: () => void;
  onReset: () => void;
}

export function ParseResult({ result, onSave, onReset }: ParseResultProps) {
  return (
    <Card className="shadow-md border-0">
      <CardContent className="space-y-4 pt-6">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Title
          </p>
          <p className="text-lg font-semibold">{result.title}</p>
        </div>

        {result.description && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-sm">{result.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Servings
            </p>
            <p>{result.servings}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Time
            </p>
            <p>
              {result.prepTime && `${result.prepTime}min prep`}
              {result.prepTime && result.cookTime && " + "}
              {result.cookTime && `${result.cookTime}min cook`}
              {!result.prepTime && !result.cookTime && "—"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
            Ingredients
          </p>
          <ul className="space-y-1 text-sm">
            {result.ingredients.slice(0, 4).map((ing) => (
              <li key={ing.item + ing.amount + ing.unit} className="flex gap-1">
                <span className="text-muted-foreground">•</span>
                <span>
                  {ing.amount && `${ing.amount} `}
                  {ing.unit && `${ing.unit} `}
                  {ing.item}
                </span>
              </li>
            ))}
            {result.ingredients.length > 4 && (
              <li className="text-muted-foreground text-xs">
                +{result.ingredients.length - 4} more
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Instructions
          </p>
          <p className="text-sm">{result.instructions.length} steps</p>
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button onClick={onSave} className="flex-1">
            Edit & Save Recipe
          </Button>
          <Button variant="outline" onClick={onReset}>
            Parse Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
