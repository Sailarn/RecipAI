"use client";

import { useState } from "react";
import {
  canShareExternalAuthUrl,
  copyAndOpenExternalAuthUrl,
  copyExternalAuthUrl,
  shareExternalAuthUrl,
} from "@/lib/auth/external-auth-flow";

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
        Open this in Safari / Chrome, where you're signed in to Google. We'll
        copy the link first, so if iOS keeps it inside the app you can paste it
        into the browser.
      </p>
      <button type="button" className="signin-btn" onClick={copyAndOpen}>
        {openStatus === "copied"
          ? "Copied — opening browser"
          : "Copy and open browser"}
      </button>
      {openStatus === "error" && (
        <p className="text-xs text-red-400">
          Could not copy and open the link.
        </p>
      )}
      {canShareExternalAuthUrl() && (
        <button
          type="button"
          className="text-sm text-[var(--fg-3)] py-2"
          onClick={shareLink}
        >
          Share link
        </button>
      )}
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
          : "Copy link"}
      </button>
      {copyStatus === "error" && (
        <p className="text-xs text-red-400">Could not copy the link.</p>
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
