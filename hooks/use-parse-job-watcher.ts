"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { recordParseHistory } from "@/lib/db/parse-history";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe, ParsedRecipeEntry } from "@/lib/db/schema";
import { claimJobCompletion } from "@/lib/parse-job-completion";
import {
  getJobIds,
  getPendingUploadToken,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";
import {
  doneParseHistoryEntry,
  failedParseHistoryEntry,
} from "@/lib/parse-recipe/parse-history-entry";
import { api, routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { isImageKitUrl, uploadImage } from "@/lib/upload/images";
import { generateId } from "@/lib/utils";

export function useParseJobWatcher() {
  const navigate = useNavigate();
  // Jobs that are already being polled (or have reached a terminal state).
  // useNavigate() returns a fresh object every render, so this hook's effect
  // re-runs on every re-render and re-polls all saved job IDs. Without this
  // guard, a re-render mid-parse spawns a second concurrent poll loop for the
  // same job — both reach "done" and fire handleDone twice (two toasts + two
  // parsedRecipes rows). Job IDs are unique per parse, so once seen here a job
  // is never polled again for the lifetime of the watcher.
  const watchedJobs = useRef<Set<string>>(new Set());
  const timeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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
            await saveParsedRecipe(
              updatedEntry,
              getPendingUploadToken() ?? undefined,
            );
            await db.parsedRecipes.delete(updatedEntry.id);
            toast.success("Recipe saved!");
          },
        },
        cancel: {
          label: "Edit",
          onClick: () => {
            trackEvent("parse_reviewed", undefined);
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
      if (watchedJobs.current.has(id)) return;
      watchedJobs.current.add(id);

      const scheduleRetry = (delayMs: number, run: () => void) => {
        const timer = setTimeout(() => {
          timeouts.current.delete(timer);
          run();
        }, delayMs);
        timeouts.current.add(timer);
      };

      const run = async () => {
        try {
          const res = await fetch(api.parseQueueJob(id));
          const { status, result, error, url: jobUrl } = await res.json();

          if (status === "done") {
            // The inline parse page may have already handled this job.
            if (!claimJobCompletion(id)) return;
            const parsed = result as ParsedRecipe;
            await handleDone(id, parsed);
            trackEvent("parse_succeeded", { source: "url" });
            recordParseHistory(
              doneParseHistoryEntry(
                id,
                parsed.title,
                parsed.sourceUrl ?? jobUrl,
              ),
            ).catch(() => {});
          } else if (status === "failed") {
            if (!claimJobCompletion(id)) return;
            const rawError: string = error || "Failed to parse recipe";
            removeJobId(id);
            trackEvent("parse_failed", { source: "url", reason: rawError });
            recordParseHistory(
              failedParseHistoryEntry(id, jobUrl, rawError),
            ).catch(() => {});
            toast.error(rawError, {
              action: {
                label: "Details",
                onClick: () => {
                  const locale = window.location.pathname.split("/")[1];
                  navigate.push(routes.parseHistory(locale));
                },
              },
            });
          } else {
            scheduleRetry(3000, run);
          }
        } catch {
          scheduleRetry(5000, run); // retry on network error
        }
      };
      run();
    },
    [handleDone, navigate],
  );

  useEffect(() => {
    // check on mount
    const savedJobIds = getJobIds().filter(Boolean);
    savedJobIds.forEach((jobId) => {
      poll(jobId);
    });

    // listen for new jobs created after mount
    const handler = (event: Event) => {
      const { jobId } = (event as CustomEvent<{ jobId: string }>).detail;
      if (jobId) poll(jobId);
    };
    window.addEventListener("parse-job-created", handler);

    return () => {
      window.removeEventListener("parse-job-created", handler);
      for (const timer of timeouts.current) clearTimeout(timer);
      timeouts.current.clear();
    };
  }, [poll]);

  return { poll };
}
