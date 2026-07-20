import type { TelegramWebApp } from "@/lib/telegram/webapp";
import type { Platform, RecipeShareInput, ShareResult } from "./types";

/**
 * Telegram Mini App platform. Haptics hit the native engine via the SDK (works
 * on iOS + Android Telegram, unlike web vibration). Sharing hands off to the
 * native share-to-chat sheet.
 */
export function createTelegramPlatform(webApp: TelegramWebApp): Platform {
  return {
    kind: "telegram",
    haptics: {
      impact: (style = "light") => webApp.HapticFeedback?.impactOccurred(style),
      notify: (type) => webApp.HapticFeedback?.notificationOccurred(type),
      selection: () => webApp.HapticFeedback?.selectionChanged(),
    },
    share: {
      recipe({ title, url }: RecipeShareInput): Promise<ShareResult> {
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        webApp.openTelegramLink?.(shareLink);
        return Promise.resolve("shared");
      },
    },
  };
}
