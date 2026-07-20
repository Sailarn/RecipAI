import type { Platform, RecipeShareInput, ShareResult } from "./types";

/**
 * Browser / PWA platform. Haptics are intentionally no-ops: the web Vibration
 * API is unavailable on iOS and the web app has never buzzed, so adding it
 * would be a surprise behaviour change. Sharing keeps the current
 * Web-Share-then-clipboard behaviour.
 */
export function createWebPlatform(): Platform {
  return {
    kind: "web",
    haptics: {
      impact: () => {},
      notify: () => {},
      selection: () => {},
    },
    share: {
      async recipe({ title, url }: RecipeShareInput): Promise<ShareResult> {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title, url });
          return "shared";
        }
        await navigator.clipboard.writeText(url);
        return "copied";
      },
    },
  };
}
