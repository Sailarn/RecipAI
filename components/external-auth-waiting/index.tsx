"use client";

import { useState } from "react";
import {
  canShareExternalAuthUrl,
  copyAndOpenExternalAuthUrl,
  copyExternalAuthUrl,
  shareExternalAuthUrl,
} from "@/lib/auth/external-browser";
import { isIos } from "@/lib/pwa";

export function ExternalAuthWaiting({
  url,
  title,
  onCancel,
}: {
  url: string;
  title: string;
  onCancel: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [openStatus, setOpenStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [shareStatus, setShareStatus] = useState<"idle" | "error">("idle");

  // iOS keeps window.open inside the in-app browser, which has none of the
  // user's saved Google accounts — the system Share sheet is the only reliable
  // way out to Safari/Chrome. Everywhere else, opening a real browser tab works.
  const shareFirst = isIos() && canShareExternalAuthUrl();

  const copyLink = async () => {
    try {
      await copyExternalAuthUrl(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  const copyAndOpen = async () => {
    try {
      await copyAndOpenExternalAuthUrl(url);
      setOpenStatus("copied");
    } catch {
      setOpenStatus("error");
    }
  };

  const shareLink = async () => {
    try {
      await shareExternalAuthUrl(url);
      setShareStatus("idle");
    } catch {
      setShareStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-3 text-center">
      <p className="font-display text-xl font-bold text-[var(--fg-1)]">
        {title}
      </p>
      <p className="text-sm text-[var(--fg-2)]">
        {shareFirst
          ? "Tap Share, then open the link in Safari or Chrome — that's where you're signed in to Google. Approve there and come back."
          : "Open this in your browser, where you're signed in to Google. Approve there, then come back."}
      </p>

      {shareFirst ? (
        <>
          <button type="button" className="signin-btn" onClick={shareLink}>
            Share link
          </button>
          {shareStatus === "error" && (
            <p className="text-xs text-red-400">Could not share the link.</p>
          )}
          <button
            type="button"
            className="text-sm text-[var(--fg-3)] py-2"
            onClick={copyLink}
          >
            {copyStatus === "copied"
              ? "Link copied — open it in your browser"
              : "Copy link instead"}
          </button>
          {copyStatus === "error" && (
            <p className="text-xs text-red-400">Could not copy the link.</p>
          )}
        </>
      ) : (
        <>
          <button type="button" className="signin-btn" onClick={copyAndOpen}>
            {openStatus === "copied" ? "Opening browser…" : "Open in browser"}
          </button>
          {openStatus === "error" && (
            <p className="text-xs text-red-400">
              Could not open the link. Copy it instead.
            </p>
          )}
          <button
            type="button"
            className="text-sm text-[var(--fg-3)] py-2"
            onClick={copyLink}
          >
            {copyStatus === "copied"
              ? "Link copied — open it in your browser"
              : "Copy link"}
          </button>
          {copyStatus === "error" && (
            <p className="text-xs text-red-400">Could not copy the link.</p>
          )}
        </>
      )}

      <button
        type="button"
        className="text-sm text-[var(--fg-3)] py-2"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}
