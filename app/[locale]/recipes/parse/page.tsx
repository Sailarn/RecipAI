"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { TransitionLink } from "@/components/transition-link";
import { api, routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { ParseForm } from "./components/parse-form";
import { ParseInfoBanner } from "./components/parse-info-banner";
import { ParseResult } from "./components/parse-result";

export interface ParsedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{ amount?: number; unit?: string; item: string }>;
  instructions: Array<{ order: number; instruction: string }>;
  imageUrl?: string;
  sourceUrl: string;
  category?: string;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function ParseRecipePage() {
  const navigate = useNavigate();
  const params = useParams();
  const locale = params.locale as string;

  const [url, setUrl] = useState("");
  const [userComment, setUserComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedRecipe | null>(null);

  const handleParse = async () => {
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL including https://");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(api.parseRecipe, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, userComment: userComment || undefined }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.recipe);
      } else {
        setError(data.error || "Failed to parse recipe");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (result) {
      localStorage.setItem("parsedRecipe", JSON.stringify(result));
      navigate.push(routes.recipes.new(locale));
    }
  };

  const handleReset = () => {
    setResult(null);
    setUrl("");
    setUserComment("");
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Parse Recipe from URL</h1>
      <div className="flex items-center justify-between mb-6">
        <TransitionLink
          href={routes.recipes.new(locale)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to create recipe form
        </TransitionLink>
      </div>
      <ParseInfoBanner />
      <ParseForm
        url={url}
        onUrlChange={setUrl}
        userComment={userComment}
        onCommentChange={setUserComment}
        loading={loading}
        error={error}
        onSubmit={handleParse}
      />
      {result && (
        <ParseResult
          result={result}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
