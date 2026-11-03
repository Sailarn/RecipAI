"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { AI_APPS, type AiAppId } from "@/lib/ai-apps";
import { mcpResourceUrl } from "@/lib/mcp/config";

const LINK_BUTTON_CLASS =
  "block w-full p-[11px] rounded-[14px] text-center font-sans text-sm font-semibold";

/**
 * One-time setup instructions for connecting RecipAI to an AI app. The app
 * can't install a connector by itself; the user adds it in the AI app, which
 * then sends them through RecipAI's sign-in and consent pages.
 */
export function ConnectAiSheet({
  app,
  chatUrl,
  onClose,
}: {
  app: AiAppId;
  /** Optional: a new chat to open once connected. */
  chatUrl?: string;
  onClose: () => void;
}) {
  const t = useTranslations("askAi");
  const [copied, setCopied] = useState(false);
  const { label, connectorSettingsUrl } = AI_APPS[app];
  const connectorUrl = mcpResourceUrl();

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(connectorUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <BottomSheet
      title={t("connectTitle", { app: label })}
      onClose={onClose}
      backdropTestId="connect-ai-backdrop"
    >
      {() => (
        <div className="flex flex-col gap-4 font-sans text-sm text-[var(--fg-2)]">
          <p>{t("connectIntro", { app: label })}</p>
          <ol className="list-decimal pl-5 flex flex-col gap-2 text-[var(--fg-1)]">
            <li>
              {t(app === "claude" ? "stepOpenClaude" : "stepOpenChatgpt")}
            </li>
            <li>{t("stepPasteUrl")}</li>
          </ol>
          <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(255,200,100,0.18)] bg-[rgba(255,170,50,0.08)] px-3 py-2">
            <code className="flex-1 truncate text-[13px] text-[var(--fg-1)]">
              {connectorUrl}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              aria-label={t("copyUrl")}
              className="shrink-0 rounded-lg p-1.5 text-[var(--fg-2)]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <ol start={3} className="list-decimal pl-5 text-[var(--fg-1)]">
            <li>{t("stepAllow")}</li>
          </ol>
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={connectorSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK_BUTTON_CLASS} bg-[var(--action-primary)] text-white`}
            >
              {t("openSettings", { app: label })}
            </a>
            {chatUrl && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={`${LINK_BUTTON_CLASS} border border-[rgba(255,200,100,0.18)] text-[var(--fg-1)]`}
              >
                {t("askNow", { app: label })}
              </a>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
