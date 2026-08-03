"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTelegramWebApp } from "@/lib/telegram/webapp";
import { extractFirstUrl } from "@/lib/url";

// Reading the clipboard without a user gesture is only possible where the
// `clipboard-read` permission has already been granted — Chromium, and only
// after the user allowed it once. Safari always shows its native paste
// confirmation, and Firefox exposes no page-script read at all, so on those the
// silent suggestion never fires and the explicit Paste button is the whole
// feature. `clipboard-read` is not in TypeScript's PermissionName union.
const CLIPBOARD_READ = "clipboard-read" as PermissionName;

function canReadBrowserClipboard(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.readText === "function"
  );
}

async function readBrowserClipboard(): Promise<string | null> {
  if (!canReadBrowserClipboard()) return null;
  try {
    return await navigator.clipboard.readText();
  } catch {
    // Denied, dismissed, or blocked by a missing gesture — all "no link".
    return null;
  }
}

// Telegram's own clipboard read is callback-based and, per Bot API 6.4, only
// resolves with real text for Mini Apps launched from the attachment menu —
// every other launch yields an empty string. Treated as best-effort: an empty
// result falls through to the browser API below.
function readTelegramClipboard(): Promise<string | null> {
  const readFromTelegram = getTelegramWebApp()?.readTextFromClipboard;
  if (typeof readFromTelegram !== "function") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    // The callback simply never fires on clients that don't support the method,
    // which would leave the Paste button spinning forever.
    const timeout = setTimeout(() => finish(null), 1000);
    try {
      readFromTelegram((text) => {
        clearTimeout(timeout);
        finish(text && text.length > 0 ? text : null);
      });
    } catch {
      clearTimeout(timeout);
      finish(null);
    }
  });
}

async function readClipboardText(): Promise<string | null> {
  return (await readTelegramClipboard()) ?? (await readBrowserClipboard());
}

interface UseClipboardLinkOptions {
  // Suppresses the silent suggestion while the field already holds something —
  // proposing a paste over text the user is typing would be hostile.
  enabled: boolean;
}

/**
 * Clipboard support for the import field: an explicit Paste action that always
 * works, plus an opportunistic suggestion of a copied link where the browser
 * allows a gesture-free read.
 */
export function useClipboardLink({ enabled }: UseClipboardLinkOptions) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  const canPaste = canReadBrowserClipboard() || Boolean(getTelegramWebApp());

  const pasteLink = useCallback(async (): Promise<string | null> => {
    setIsReading(true);
    try {
      const text = await readClipboardText();
      return text ? extractFirstUrl(text) : null;
    } finally {
      setIsReading(false);
    }
  }, []);

  const dismissSuggestion = useCallback(() => {
    setSuggestion((current) => {
      if (current) dismissedRef.current.add(current);
      return null;
    });
  }, []);

  // Re-checked when the tab regains visibility, not just on mount: copying a
  // link means leaving the app, so the interesting moment is coming back.
  useEffect(() => {
    if (!enabled) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;

    const detect = async () => {
      if (
        !canReadBrowserClipboard() ||
        typeof navigator.permissions?.query !== "function"
      ) {
        return;
      }
      try {
        const status = await navigator.permissions.query({
          name: CLIPBOARD_READ,
        });
        if (status.state !== "granted") return;
      } catch {
        // Unknown permission name (Safari, Firefox) — no silent read available.
        return;
      }
      const text = await readBrowserClipboard();
      const link = text ? extractFirstUrl(text) : null;
      if (cancelled || !link || dismissedRef.current.has(link)) return;
      setSuggestion(link);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") detect();
    };

    detect();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);

  return { canPaste, isReading, pasteLink, suggestion, dismissSuggestion };
}
