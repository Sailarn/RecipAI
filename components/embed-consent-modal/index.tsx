"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { preWarmEmbedWorker } from "@/lib/parse-recipe/embed-client";
import {
  grantEmbedConsent,
  hasEmbedConsent,
} from "@/lib/parse-recipe/embed-consent";

let shownThisSession = false;

export function EmbedConsentModal() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!shownThisSession && !hasEmbedConsent()) {
      shownThisSession = true;
      setOpen(true);
    }
  }, []);

  function requestClose() {
    if (closing) return;
    setClosing(true);
  }

  function handleAllow() {
    grantEmbedConsent();
    // Download proceeds in the background; progress is shown in the
    // notifications bell, not here — so the modal closes immediately.
    preWarmEmbedWorker();
    requestClose();
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end touch-none">
      <button
        type="button"
        aria-label="Close"
        onClick={requestClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[4px] border-none cursor-pointer p-0"
      />

      <div
        onAnimationEnd={() => {
          if (closing) setOpen(false);
        }}
        className="relative z-[1] w-full bg-[rgba(18,14,8,0.92)] backdrop-blur-[32px] backdrop-saturate-200 border border-[rgba(255,200,100,0.18)] rounded-t-[28px] px-[18px] pt-5 pb-[max(36px,calc(env(safe-area-inset-bottom)+20px))] shadow-[0_-8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,220,130,0.12)]"
        style={{
          animation: closing
            ? "sheetSlideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="w-9 h-1 rounded-[2px] bg-[rgba(255,200,100,0.25)] mx-auto mb-5" />

        <p className="text-4xl text-center mb-3" aria-hidden="true">
          🤖
        </p>
        <p className="text-[17px] font-bold text-[var(--fg-1)] font-display text-center mb-2">
          AI Ingredient Matching
        </p>
        <p className="text-[13px] text-[var(--fg-2)] leading-[1.65] text-center mb-6">
          RecipAI can download an AI model (~117 MB) to your device for better
          offline ingredient recognition. Stored locally, never leaves your
          device.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAllow}
            className="p-3.5 bg-[linear-gradient(135deg,rgba(255,180,60,0.25),rgba(255,140,30,0.15))] text-[rgba(255,210,120,0.95)] border border-[rgba(255,200,100,0.30)] rounded-2xl text-sm font-bold font-sans cursor-pointer"
          >
            Allow Download
          </button>
          <button
            type="button"
            onClick={requestClose}
            className="p-[11px] bg-transparent text-[var(--fg-3)] border-none rounded-xl text-[13px] font-sans cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
