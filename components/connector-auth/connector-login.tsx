"use client";

import { KeyRound, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GoogleLogo } from "@/components/google-logo";
import { authClient } from "@/lib/auth/auth-client";
import { trackEvent } from "@/lib/telemetry";
import { ConnectorAuthCard } from "./auth-card";
import { navigateTo } from "./navigate";

const CHIP_CLASS =
  "w-7 h-7 rounded-lg bg-black/30 flex items-center justify-center shrink-0";

/**
 * Sign-in step of the connector OAuth flow. `authorizeUrl` is the original
 * `/api/auth/mcp/authorize?…` request: every sign-in method returns there, so
 * the flow continues to the consent page with the new session. (The plugin's
 * own after-sign-in hook usually resumes it first; the explicit return makes
 * the flow independent of that.)
 */
export function ConnectorLogin({
  authorizeUrl,
  clientName,
}: {
  authorizeUrl: string;
  clientName: string;
}) {
  const t = useTranslations("connector");
  const tAuth = useTranslations("auth");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const signInGoogle = async () => {
    trackEvent("connector_login", { method: "google" });
    setBusy(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: authorizeUrl,
    });
  };

  const signInTelegram = async () => {
    trackEvent("connector_login", { method: "telegram" });
    setBusy(true);
    await authClient.signInWithTelegramOIDC({ callbackURL: authorizeUrl });
  };

  const signInPasskey = async () => {
    trackEvent("connector_login", { method: "passkey" });
    setError(undefined);
    setBusy(true);
    try {
      await authClient.signIn.passkey();
    } catch {
      // The session check below decides the outcome.
    }
    const session = await authClient.getSession().catch(() => null);
    if (session?.data) {
      navigateTo(authorizeUrl);
      return;
    }
    setBusy(false);
    setError(t("signInFailed"));
  };

  return (
    <ConnectorAuthCard title={t("signInTitle")}>
      <p className="font-sans text-sm leading-[1.5] text-[var(--fg-2)] text-center mb-5">
        {t("signInBody", { client: clientName })}
      </p>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={signInGoogle}
          disabled={busy}
          className="signin-btn disabled:opacity-60"
        >
          <div className={CHIP_CLASS}>
            <GoogleLogo />
          </div>
          <span>{tAuth("continueGoogle")}</span>
        </button>
        <button
          type="button"
          onClick={signInPasskey}
          disabled={busy}
          className="signin-btn disabled:opacity-60"
        >
          <div className={`${CHIP_CLASS} text-[var(--food-accent)]`}>
            <KeyRound size={14} strokeWidth={2} />
          </div>
          <span>{tAuth("continuePasskey")}</span>
        </button>
        <button
          type="button"
          onClick={signInTelegram}
          disabled={busy}
          className="signin-btn disabled:opacity-60"
        >
          <div className={`${CHIP_CLASS} text-[#229ED9]`}>
            <Send size={14} strokeWidth={2} />
          </div>
          <span>{tAuth("continueTelegram")}</span>
        </button>
      </div>
      {error && (
        <p className="text-center text-xs text-red-400 mt-3">{error}</p>
      )}
      <p className="text-center text-[11px] text-[var(--fg-3)] mt-4 leading-[1.5]">
        {t("accountOnlyHint")}
      </p>
    </ConnectorAuthCard>
  );
}
