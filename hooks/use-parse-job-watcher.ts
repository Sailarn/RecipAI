"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe, ParsedRecipeEntry } from "@/lib/db/schema";
import { isImageKitUrl, uploadImage } from "@/lib/images";
import {
  getJobIds,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";
import { api, routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { generateId } from "@/lib/utils";

export function useParseJobWatcher() {
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDone = useCallback(
    async (id: string, result: ParsedRecipe) => {
      // Read and preserve the token before removeJobId wipes it.
      const uploadToken = getUploadToken(id) ?? undefined;
      if (uploadToken) storePendingUploadToken(uploadToken);
      removeJobId(id);

      // save to parsedRecipes table
      const entry: ParsedRecipeEntry = {
        id: generateId(),
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
          const uploaded = await uploadImage(imageUrl, { uploadToken });
          imageUrl = uploaded.url;
          imageFileId = uploaded.fileId;
        } catch {
          // continue without image upload
        }
      }

      const updatedEntry = { ...entry, imageUrl, imageFileId };
      await db.parsedRecipes.add(updatedEntry);

      toast(result.title, {
        description: "Recipe parsed — tap to review",
        duration: 10000,
        closeButton: true,
        action: {
          label: "Save",
          onClick: async () => {
            await saveParsedRecipe(updatedEntry);
            await db.parsedRecipes.delete(updatedEntry.id);
            toast.success("Recipe saved!");
          },
        },
        cancel: {
          label: "Edit",
          onClick: () => {
            localStorage.setItem("parsedRecipe", JSON.stringify(updatedEntry));
            db.parsedRecipes.delete(updatedEntry.id).catch(() => {});
            const locale = window.location.pathname.split("/")[1];
            navigate.push(routes.recipes.new(locale));
          },
        },
      });
    },
    [navigate],
  );

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
    const handler = (event: Event) => {
      const { jobId } = (event as CustomEvent).detail;
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
