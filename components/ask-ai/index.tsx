"use client";

import { WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useShareDismiss } from "@/components/recipe-detail/share-action/use-share-dismiss";
import { AI_APPS, type AiAppId, ENABLED_AI_APPS } from "@/lib/ai-apps";
import { useAiConnections } from "@/lib/hooks/use-ai-connections";
import { trackEvent } from "@/lib/telemetry";
import { ConnectAiSheet } from "./connect-sheet";

export const ASK_AI_BUTTON_CLASS =
  "flex w-full items-center justify-center gap-1.5 p-[13px] rounded-[14px] bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)] backdrop-blur-[12px] text-[var(--fg-1)] font-sans text-sm font-medium cursor-pointer";

const MENU_ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-sans text-sm font-medium text-white hover:bg-white/5 [-webkit-tap-highlight-color:transparent]";

/**
 * "Ask AI" on a recipe: a wand button with a small menu of AI apps. A
 * connected app opens a new chat about this recipe (the prompt names the
 * recipe so the app can fetch it through the RecipAI connector). An app that
 * isn't connected yet opens the one-time setup sheet instead.
 */
export function AskAiButton({
  recipeId,
  title,
}: {
  recipeId: string;
  title: string;
}) {
  const t = useTranslations("askAi");
  const [open, setOpen] = useState(false);
  const [setupApp, setSetupApp] = useState<AiAppId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { status, connectedApps } = useAiConnections(true);

  const close = useCallback(() => setOpen(false), []);
  useShareDismiss(open, rootRef, close);

  const prompt = t("prompt", { title, id: recipeId });
  // Until the status is known, assume connected: opening the chat is harmless,
  // and blocking on a fetch would cost the click its user-gesture.
  const isConnected = (app: AiAppId) =>
    status !== "ready" || connectedApps.has(app);

  const openChat = (app: AiAppId) => {
    trackEvent("ask_ai_opened", { app, connected: connectedApps.has(app) });
    // Prefilled chats aren't guaranteed, so the prompt is on the clipboard too.
    navigator.clipboard
      ?.writeText(prompt)
      .then(() => toast.success(t("promptCopied", { app: AI_APPS[app].label })))
      .catch(() => {});
    close();
  };

  return (
    <div ref={rootRef} className="relative flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={ASK_AI_BUTTON_CLASS}
      >
        <WandSparkles size={15} strokeWidth={1.9} aria-hidden />
        <span>{t("button")}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("menuLabel")}
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[200px] overflow-hidden rounded-[18px] border border-[rgba(255,198,88,0.32)] bg-[rgba(10,10,8,0.97)] py-1 shadow-[0_24px_70px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
        >
          {ENABLED_AI_APPS.map((app) =>
            isConnected(app) ? (
              <a
                key={app}
                role="menuitem"
                href={AI_APPS[app].newChatUrl(prompt)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => openChat(app)}
                className={MENU_ITEM_CLASS}
              >
                {AI_APPS[app].label}
              </a>
            ) : (
              <button
                key={app}
                type="button"
                role="menuitem"
                onClick={() => {
                  setSetupApp(app);
                  close();
                }}
                className={MENU_ITEM_CLASS}
              >
                <span>{AI_APPS[app].label}</span>
                <span className="text-xs font-normal text-white/50">
                  {t("connect")}
                </span>
              </button>
            ),
          )}
        </div>
      )}

      {setupApp && (
        <ConnectAiSheet
          app={setupApp}
          chatUrl={AI_APPS[setupApp].newChatUrl(prompt)}
          onClose={() => setSetupApp(null)}
        />
      )}
    </div>
  );
}
