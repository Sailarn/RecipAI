"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { db } from "@/lib/db/db";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipeEntry } from "@/lib/db/schema";
import { isImageKitUrl, uploadImage } from "@/lib/images";
import { getJobIds, removeJobId } from "@/lib/parse-job-storage";
import { api } from "@/lib/routes";

export function useParseJobWatcher() {
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDone = useCallback(async (id: string, result: ParsedRecipe) => {
    removeJobId(id);

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

    let imageUrl = entry.imageUrl;
    let imageFileId: string | undefined;

    if (imageUrl && !isImageKitUrl(imageUrl)) {
      try {
        const uploaded = await uploadImage(imageUrl);
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;
      } catch {
        // continue without image upload
      }
    }

    await db.parsedRecipes.add({ ...entry, imageUrl, imageFileId });

    toast(result.title, {
      description: "Recipe parsed — tap to review",
      duration: 5000,
      closeButton: true,
      action: {
        label: "Save",
        onClick: async () => {
          await saveParsedRecipe(entry);
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
            await handleDone(id, result as ParsedRecipe);
          } else if (status === "failed") {
            removeJobId(id);
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
    const savedJobIds = getJobIds();
    savedJobIds.forEach((jobId) => {
      poll(jobId);
    });

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
