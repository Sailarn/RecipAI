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
        Complete Google authentication in your browser, then return here.
      </p>
      <button
        type="button"
        className="signin-btn"
        onClick={() => openExternalAuth(url)}
      >
        Open browser
      </button>
      <button type="button" className="signin-btn" onClick={copyLink}>
        {copyStatus === "copied" ? "Link copied" : "Copy link"}
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
