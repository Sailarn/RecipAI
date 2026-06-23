"use client";

import { useState } from "react";
import {
  copyExternalAuthUrl,
  openExternalAuth,
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

  const copyLink = async () => {
    try {
      await copyExternalAuthUrl(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-3 text-center">
      <p className="font-display text-xl font-bold text-[var(--fg-1)]">
        {title}
      </p>
      <p className="text-sm text-[var(--fg-2)]">
        Copy this link and open it in your browser (Safari / Chrome), where
        you're signed in to Google. Approve there, then return here — the in-app
        browser won't show your saved accounts.
      </p>
      <button type="button" className="signin-btn" onClick={copyLink}>
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
        onClick={() => openExternalAuth(url)}
      >
        Try opening in browser
      </button>
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
