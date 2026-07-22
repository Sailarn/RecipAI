import { api } from "@/lib/routes";
import type { TelegramWebApp } from "@/lib/telegram/webapp";
import type { Platform, RecipeShareInput, ShareResult } from "./types";

/**
 * Shares a rich recipe card into a chat via a prepared inline message
 * (Bot API 8.0). Falls back to a plain link share when the backend or the
 * client can't provide it. See specs/deep-tg/02-native-sharing.md.
 */
async function shareRecipeCard(
  webApp: TelegramWebApp,
  id: string,
): Promise<boolean> {
  if (!webApp.shareMessage) return false;
  const res = await fetch(api.telegramShareRecipe, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipeId: id }),
  });
  if (!res.ok) return false;
  const { preparedMessageId } = (await res.json()) as {
    preparedMessageId?: string;
  };
  if (!preparedMessageId) return false;
  webApp.shareMessage(preparedMessageId);
  return true;
}

function shareRecipeLink(
  webApp: TelegramWebApp,
  input: RecipeShareInput,
): void {
  const shareLink = `https://t.me/share/url?url=${encodeURIComponent(input.url)}&text=${encodeURIComponent(input.title)}`;
  webApp.openTelegramLink?.(shareLink);
}

/**
 * Telegram Mini App platform. Haptics hit the native engine via the SDK (works
 * on iOS + Android Telegram, unlike web vibration). Sharing hands off to the
 * native share-to-chat sheet.
 *
 * `webApp` is optional: `kind` must read "telegram" (so feature gating hides
 * web-only UI like "Connected accounts") from the moment `isTelegramEnvironment()`
 * knows we're in a Mini App, which is well before the SDK script itself finishes
 * loading and TelegramProvider gets a live `webApp` instance. Haptics/share are
 * no-ops until then — the same as they'd be moments earlier on web.
 */
export function createTelegramPlatform(
  webApp: TelegramWebApp | undefined,
): Platform {
  return {
    kind: "telegram",
    haptics: {
      impact: (style = "light") =>
        webApp?.HapticFeedback?.impactOccurred(style),
      notify: (type) => webApp?.HapticFeedback?.notificationOccurred(type),
      selection: () => webApp?.HapticFeedback?.selectionChanged(),
    },
    share: {
      async recipe(input: RecipeShareInput): Promise<ShareResult> {
        if (!webApp) return "shared";
        // Prefer the native card; degrade to a plain link share if the prepared
        // message can't be created (network, older client, backend error).
        const shared = await shareRecipeCard(webApp, input.id).catch(
          () => false,
        );
        if (!shared) shareRecipeLink(webApp, input);
        return "shared";
      },
    },
  };
}
