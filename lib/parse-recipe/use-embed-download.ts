"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/telemetry";
import { preWarmEmbedWorker } from "./embed-client";
import { isEmbedDownloadInterrupted } from "./embed-download-state";

export type EmbedDownloadPhase = "idle" | "downloading" | "done";

export interface EmbedDownloadState {
  phase: EmbedDownloadPhase;
  progress: number;
}

const DONE_AUTOCLEAR_MS = 1800;

/**
 * Tracks the embed model download via the window events the embed worker
 * dispatches (`embed-model-progress` / `embed-model-loaded`). Live progress is
 * ephemeral (never persisted, so a reload starts visually clean), but the
 * download *lifecycle* is persisted: if a previous download was interrupted by
 * closing the app, this hook auto-resumes it on mount. Returns idle until a
 * download begins; after completion it shows "done" briefly then clears.
 */
export function useEmbedDownload(): EmbedDownloadState {
  const [phase, setPhase] = useState<EmbedDownloadPhase>("idle");
  const [progress, setProgress] = useState(0);

  // Resume a download the user interrupted by closing the app mid-way. The
  // worker re-emits progress/loaded events, which the listeners below pick up.
  // preWarmEmbedWorker self-guards on consent, so this no-ops without it.
  useEffect(() => {
    if (isEmbedDownloadInterrupted()) {
      setPhase("downloading");
      preWarmEmbedWorker();
    }
  }, []);

  useEffect(() => {
    const onProgress = (event: Event) => {
      const { progress: value } = (event as CustomEvent<{ progress: number }>)
        .detail;
      setProgress(value);
      setPhase("downloading");
    };
    const onLoaded = () => {
      setProgress(100);
      setPhase("done");
      trackEvent("embed_model_downloaded", undefined);
    };

    window.addEventListener("embed-model-progress", onProgress);
    window.addEventListener("embed-model-loaded", onLoaded);
    return () => {
      window.removeEventListener("embed-model-progress", onProgress);
      window.removeEventListener("embed-model-loaded", onLoaded);
    };
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const timer = setTimeout(() => {
      setPhase("idle");
      setProgress(0);
    }, DONE_AUTOCLEAR_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return { phase, progress };
}
