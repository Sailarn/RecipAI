"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

function canPasteHere(): boolean {
  return canReadBrowserClipboard() || Boolean(getTelegramWebApp());
}

// Clipboard support never changes while the page is open — nothing to
// subscribe to.
function subscribeToNothing(): () => void {
  return () => {};
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

  // The server can't see navigator, so it renders without the Paste button;
  // reading support during render would mismatch on hydration.
  const canPaste = useSyncExternalStore(
    subscribeToNothing,
    canPasteHere,
    () => false,
  );

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

  // Re-checked whenever the user comes back, not just on mount: copying a link
  // means leaving the app. Chromium rejects readText() with "Document is not
  // focused" until the window has focus, and visibilitychange fires before
  // focus returns — so `focus` is the event that actually lands, and a read
  // from an unfocused document is skipped rather than wasted. A permission
  // granted mid-session (the Paste button's prompt) also triggers a check.
  useEffect(() => {
    if (!enabled) {
      setSuggestion(null);
      return;
    }
    if (
      !canReadBrowserClipboard() ||
      typeof navigator.permissions?.query !== "function"
    ) {
      return;
    }
    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const detect = async () => {
      if (permissionStatus?.state !== "granted" || !document.hasFocus()) {
        return;
      }
      const text = await readBrowserClipboard();
      if (cancelled) return;
      const link = text ? extractFirstUrl(text) : null;
      setSuggestion(link && !dismissedRef.current.has(link) ? link : null);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") detect();
    };

    navigator.permissions
      .query({ name: CLIPBOARD_READ })
      .then((status) => {
        if (cancelled) return;
        permissionStatus = status;
        status.addEventListener("change", detect);
        detect();
      })
      .catch(() => {
        // Unknown permission name (Safari, Firefox) — no silent read available.
      });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", detect);
    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener("change", detect);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", detect);
    };
  }, [enabled]);

  return { canPaste, isReading, pasteLink, suggestion, dismissSuggestion };
}
