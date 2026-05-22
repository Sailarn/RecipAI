"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { preWarmEmbedWorker } from "@/lib/parse-recipe/embed-client";
import {
  grantEmbedConsent,
  hasEmbedConsent,
} from "@/lib/parse-recipe/embed-consent";

let shownThisSession = false;

type Phase = "consent" | "downloading" | "done";

export function EmbedConsentModal() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("consent");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (!shownThisSession && !hasEmbedConsent()) {
      shownThisSession = true;
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const onProgress = (e: Event) => {
      const { progress: p } = (e as CustomEvent<{ progress: number }>).detail;
      setProgress(p);
      setPhase("downloading");
    };
    const onLoaded = () => {
      setProgress(100);
      setPhase("done");
      setTimeout(() => setClosing(true), 1800);
    };

    window.addEventListener("embed-model-progress", onProgress);
    window.addEventListener("embed-model-loaded", onLoaded);
    return () => {
      window.removeEventListener("embed-model-progress", onProgress);
      window.removeEventListener("embed-model-loaded", onLoaded);
    };
  }, []);

  function handleAllow() {
    grantEmbedConsent();
    setPhase("downloading");
    preWarmEmbedWorker();
  }

  function handleSkip() {
    setClosing(true);
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "flex-end",
        touchAction: "none",
      }}
    >
      {phase === "consent" && (
        <button
          type="button"
          aria-label="Close"
          onClick={handleSkip}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        />
      )}

      <div
        onAnimationEnd={() => {
          if (closing) setOpen(false);
        }}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          background: "rgba(18,14,8,0.92)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,200,100,0.18)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 18px",
          paddingBottom: "max(36px, calc(env(safe-area-inset-bottom) + 20px))",
          boxShadow:
            "0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,130,0.12)",
          animation: closing
            ? "sheetSlideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,200,100,0.25)",
            margin: "0 auto 20px",
          }}
        />

        {phase === "consent" && (
          <>
            <p
              style={{
                fontSize: 36,
                textAlign: "center",
                marginBottom: 12,
              }}
              aria-hidden="true"
            >
              🤖
            </p>
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--fg-1)",
                fontFamily: "var(--font-display)",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              AI Ingredient Matching
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-2)",
                lineHeight: 1.65,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              RecipAI can download an AI model (~117 MB) to your device for
              better offline ingredient recognition. Stored locally, never
              leaves your device.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={handleAllow}
                style={{
                  padding: 14,
                  background:
                    "linear-gradient(135deg, rgba(255,180,60,0.25), rgba(255,140,30,0.15))",
                  color: "rgba(255,210,120,0.95)",
                  border: "1px solid rgba(255,200,100,0.30)",
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Allow Download
              </button>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  padding: 11,
                  background: "transparent",
                  color: "var(--fg-3)",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 13,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Not now
              </button>
            </div>
          </>
        )}

        {(phase === "downloading" || phase === "done") && (
          <div style={{ paddingBottom: 8 }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--fg-1)",
                fontFamily: "var(--font-display)",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              {phase === "done" ? "Model ready" : "Downloading AI model…"}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--fg-3)",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {phase === "done"
                ? "Ingredient matching is now active"
                : `${progress}% — ~117 MB, one-time download`}
            </p>

            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,200,100,0.12)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  width: `${progress}%`,
                  background:
                    phase === "done"
                      ? "rgba(74,222,128,0.8)"
                      : "rgba(255,180,60,0.8)",
                  transition: "width 0.4s ease, background 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
