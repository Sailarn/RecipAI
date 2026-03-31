"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { db } from "@/lib/db/db";
import { createRecipe } from "@/lib/db/recipes";
import type { ParsedRecipeEntry } from "@/lib/db/schema";
import { api } from "@/lib/routes";

const JOB_KEY = "parseJobId";

export function useParseJobWatcher() {
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDone = useCallback(async (result: ParsedRecipe) => {
    localStorage.removeItem(JOB_KEY);

    // save to parsedRecipes table
    const entry: ParsedRecipeEntry = {
      id: crypto.randomUUID(),
      title: result.title,
      description: result.description,
      prepTime: result.prepTime,
      cookTime: result.cookTime,
      servings: result.servings ?? 1,
      ingredients: result.ingredients,
      instructions: result.instructions,
      imageUrl: result.imageUrl,
      sourceUrl: result.sourceUrl,
      category: result.category,
      createdAt: new Date(),
    };

    await db.parsedRecipes.add(entry);

    toast(result.title, {
      description: "Recipe parsed — tap to review",
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: "Save",
        onClick: async () => {
          await createRecipe({
            title: entry.title,
            description: entry.description,
            imageUrl: entry.imageUrl,
            prepTime: entry.prepTime,
            cookTime: entry.cookTime,
            totalTime:
              (entry.prepTime || 0) + (entry.cookTime || 0) || undefined,
            servings: entry.servings,
            ingredients: entry.ingredients.map((ing) => ({
              id: crypto.randomUUID(),
              item: ing.item,
              amount: ing.amount,
              unit: ing.unit,
            })),
            instructions: entry.instructions.map((inst, idx) => ({
              id: crypto.randomUUID(),
              order: idx + 1,
              instruction: inst.instruction,
            })),
            sourceUrl: entry.sourceUrl,
            category: entry.category,
          });
          await db.parsedRecipes.delete(entry.id);
          toast.success("Recipe saved!");
        },
      },
      cancel: {
        label: "Edit",
        onClick: () => {
          localStorage.setItem("parsedRecipe", JSON.stringify(entry));
          const locale = window.location.pathname.split("/")[1];
          window.location.href = `/${locale}/recipes/new`;
        },
      },
    });
  }, []);

  const poll = useCallback(
    (id: string) => {
      const run = async () => {
        try {
          const res = await fetch(api.parseQueueJob(id));
          const { status, result, error } = await res.json();

          if (status === "done") {
            await handleDone(result as ParsedRecipe);
          } else if (status === "failed") {
            localStorage.removeItem(JOB_KEY);
            toast.error(error || "Failed to parse recipe");
          } else {
            pollRef.current = setTimeout(run, 3000);
          }
        } catch {
          pollRef.current = setTimeout(run, 5000); // retry on network error
        }
      };
      run();
    },
    [handleDone],
  );

  useEffect(() => {
    // check on mount
    const savedJobId = localStorage.getItem(JOB_KEY);
    if (savedJobId) poll(savedJobId);

    // listen for new jobs created after mount
    const handler = (e: Event) => {
      const { jobId } = (e as CustomEvent).detail;
      poll(jobId);
    };
    window.addEventListener("parse-job-created", handler);

    return () => {
      window.removeEventListener("parse-job-created", handler);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [poll]);

  return { poll };
}
