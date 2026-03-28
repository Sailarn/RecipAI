"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@/lib/transitions";

export interface ParsedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
  }>;
  instructions: Array<{
    order: number;
    instruction: string;
  }>;
  imageUrl?: string;
  sourceUrl: string;
}

export default function ParseRecipePage() {
  const t = useTranslations();
  const navigate = useNavigate();
  const params = useParams();
  const locale = params.locale as string;

  const [url, setUrl] = useState("");
  const [userComment, setUserComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedRecipe | null>(null);

  function isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  const handleParse = async () => {
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL including https://");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          userComment: userComment || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.recipe);
      } else {
        setError(data.error || "Failed to parse recipe");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (result) {
      // Store in localStorage
      localStorage.setItem("parsedRecipe", JSON.stringify(result));
      navigate.push(`/${locale}/recipes/new`);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="text-2xl font-bold mb-6">🔗 Parse Recipe from URL</h1>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm">
          ✨ <strong>Works with any recipe website!</strong> Just paste the URL
          below.
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-2">
          Examples: silpo.ua, allrecipes.com, bbcgoodfood.com,
          cooking.nytimes.com
        </p>
      </div>

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="url">Recipe URL *</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://silpo.ua/recipes/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="comment">
            Optional: Hints for AI
            <span className="text-sm text-[var(--muted-foreground)] ml-2">
              (e.g., "Ingredients are in grams, not cups")
            </span>
          </Label>
          <Textarea
            id="comment"
            placeholder="Any hints to help parse correctly..."
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </div>

        <Button
          onClick={handleParse}
          disabled={!url || loading}
          className="w-full"
        >
          {loading ? "⏳ Parsing... (5-15 seconds)" : "🔍 Parse Recipe"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-6">
          <p className="font-semibold text-red-800 dark:text-red-200 mb-1">
            ❌ Error
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Result Preview */}
      {result && (
        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <h2 className="text-xl font-bold">Recipe Parsed Successfully!</h2>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                Title:
              </span>
              <p className="text-lg font-medium">{result.title}</p>
            </div>

            {result.description && (
              <div>
                <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                  Description:
                </span>
                <p className="text-sm">{result.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-[var(--muted-foreground)]">
                  Servings:
                </span>
                <p>{result.servings}</p>
              </div>

              <div>
                <span className="font-semibold text-[var(--muted-foreground)]">
                  Time:
                </span>
                <p>
                  {result.prepTime && `${result.prepTime}min prep`}
                  {result.prepTime && result.cookTime && " + "}
                  {result.cookTime && `${result.cookTime}min cook`}
                  {!result.prepTime && !result.cookTime && "Not specified"}
                </p>
              </div>
            </div>

            <div>
              <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                Ingredients:
              </span>
              <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                {result.ingredients.slice(0, 4).map((ing, i) => (
                  <li key={ing.item + ing.amount + ing.unit}>
                    {ing.amount && `${ing.amount} `}
                    {ing.unit && `${ing.unit} `}
                    {ing.item}
                  </li>
                ))}
                {result.ingredients.length > 4 && (
                  <li className="text-[var(--muted-foreground)]">
                    ... and {result.ingredients.length - 4} more
                  </li>
                )}
              </ul>
            </div>

            <div>
              <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                Instructions:
              </span>
              <p className="text-sm">{result.instructions.length} steps</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--card-border)]">
            <Button onClick={handleSave} className="flex-1">
              ✏️ Edit & Save Recipe
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setUrl("");
                setUserComment("");
              }}
            >
              🔄 Parse Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
