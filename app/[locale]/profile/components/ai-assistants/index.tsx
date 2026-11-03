"use client";

import { Check, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConnectAiSheet } from "@/components/ask-ai/connect-sheet";
import { AI_APPS, type AiAppId, ENABLED_AI_APPS } from "@/lib/ai-apps";
import { authClient } from "@/lib/auth/auth-client";
import { useAiConnections } from "@/lib/hooks/use-ai-connections";

// Same card, row and pill styles as the profile's "Connected accounts" card
// (components/profile-auth/linked-accounts.tsx).
const CONNECT_PILL_CLASS =
  "py-[5px] px-3 rounded-full bg-[rgba(255,170,50,0.10)] border border-[rgba(255,200,100,0.25)] font-sans text-xs font-semibold text-[var(--food-accent)] cursor-pointer transition-all duration-150";
const DISCONNECT_PILL_CLASS =
  "py-[5px] px-3 rounded-full border border-white/[0.12] font-sans text-xs font-medium text-[var(--fg-2)] cursor-pointer disabled:opacity-50";

/**
 * Profile card listing the AI apps RecipAI can be connected to, with each
 * one's status: Connect opens the setup sheet, Disconnect revokes the app's
 * access at once. Signed-in users only.
 */
export function AiAssistants() {
  const t = useTranslations("askAi");
  const { data: session } = authClient.useSession();
  const { status, connections, connectedApps, disconnect } = useAiConnections(
    Boolean(session),
  );
  const [setupApp, setSetupApp] = useState<AiAppId | null>(null);
  const [busyApp, setBusyApp] = useState<AiAppId | null>(null);

  if (!session) return null;

  const handleDisconnect = async (app: AiAppId) => {
    const label = AI_APPS[app].label;
    setBusyApp(app);
    try {
      await disconnect(
        connections
          .filter((connection) => connection.app === app)
          .map((connection) => connection.clientId),
      );
      toast.success(t("disconnected", { app: label }));
    } catch {
      toast.error(t("disconnectFailed", { app: label }));
    } finally {
      setBusyApp(null);
    }
  };

  return (
    <div className="glass-card mb-3 rounded-3xl overflow-hidden">
      <p className="text-xs font-semibold text-[var(--fg-3)] uppercase tracking-[0.07em] px-4 pt-[14px] pb-1.5">
        {t("sectionTitle")}
      </p>
      {ENABLED_AI_APPS.map((app, index) => {
        const connected = connectedApps.has(app);
        return (
          <div
            key={app}
            className={`flex items-center py-2.5 px-4 gap-3${index > 0 ? " border-t border-[var(--border-subtle)]" : ""}`}
          >
            <div className="w-8 h-8 rounded-[10px] bg-[rgba(0,0,0,0.28)] border border-white/[0.08] flex items-center justify-center shrink-0">
              <WandSparkles
                size={15}
                strokeWidth={2}
                className="text-[var(--food-accent)]"
              />
            </div>
            <span className="font-sans text-sm text-[var(--fg-1)] flex-1">
              {AI_APPS[app].label}
            </span>
            {status === "ready" &&
              (connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-[5px]">
                    <div className="w-[18px] h-[18px] rounded-full bg-green-400/[0.18] border border-green-400/[0.4] flex items-center justify-center">
                      <Check size={11} className="text-green-400" />
                    </div>
                    <span className="font-sans text-xs text-green-400">
                      {t("connected")}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={busyApp === app}
                    onClick={() => handleDisconnect(app)}
                    className={DISCONNECT_PILL_CLASS}
                  >
                    {t("disconnect")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSetupApp(app)}
                  className={CONNECT_PILL_CLASS}
                >
                  {t("connect")}
                </button>
              ))}
          </div>
        );
      })}
      {setupApp && (
        <ConnectAiSheet app={setupApp} onClose={() => setSetupApp(null)} />
      )}
    </div>
  );
}
