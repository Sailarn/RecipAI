"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { trackEvent } from "@/lib/telemetry";
import { ConnectorAuthCard } from "./auth-card";
import { navigateTo } from "./navigate";

const CONSENT_ENDPOINT = "/api/auth/oauth2/consent";

/** A redirect target the consent endpoint returned, if it is safe to follow. */
export function safeRedirectTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["javascript:", "data:", "vbscript:"].includes(url.protocol)
      ? null
      : url.toString();
  } catch {
    return null;
  }
}

type Status = "idle" | "working" | "failed" | "signedOut";

/**
 * Consent step of the connector OAuth flow: the user approves (or denies) the
 * AI chat app, and the browser is sent back to the app's OAuth callback with
 * an authorization code (or `error=access_denied`).
 */
export function ConnectorConsent({
  consentCode,
  clientName,
  account,
}: {
  consentCode: string;
  clientName: string;
  account: string;
}) {
  const t = useTranslations("connector");
  const [status, setStatus] = useState<Status>("idle");

  const decide = async (accept: boolean) => {
    setStatus("working");
    try {
      const response = await fetch(CONSENT_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept, consent_code: consentCode }),
      });
      const body = response.ok ? await response.json() : null;
      const target = safeRedirectTarget(body?.redirectURI);
      if (!target) {
        setStatus("failed");
        return;
      }
      trackEvent("connector_consent", { client: clientName, accept });
      navigateTo(target);
    } catch {
      setStatus("failed");
    }
  };

  const signOut = async () => {
    await authClient.signOut().catch(() => {});
    setStatus("signedOut");
  };

  if (status === "failed") {
    return (
      <ConnectorAuthCard title={t("consentFailedTitle")}>
        <p className="text-center text-sm text-[var(--fg-2)]">
          {t("startAgain")}
        </p>
      </ConnectorAuthCard>
    );
  }

  if (status === "signedOut") {
    return (
      <ConnectorAuthCard title={t("signedOutTitle")}>
        <p className="text-center text-sm text-[var(--fg-2)]">
          {t("startAgain")}
        </p>
      </ConnectorAuthCard>
    );
  }

  const working = status === "working";
  return (
    <ConnectorAuthCard title={t("consentTitle", { client: clientName })}>
      <p className="font-sans text-sm leading-[1.5] text-[var(--fg-2)] text-center">
        {t("consentBody", { client: clientName })}
      </p>
      <p className="font-sans text-xs text-[var(--fg-3)] text-center mt-3 mb-5">
        {t("signedInAs", { account })}{" "}
        <button
          type="button"
          onClick={signOut}
          disabled={working}
          className="underline underline-offset-2 text-[var(--fg-2)]"
        >
          {t("notYou")}
        </button>
      </p>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => decide(true)}
          disabled={working}
          className="w-full p-[13px] rounded-[16px] bg-[var(--action-primary)] text-white font-sans text-[14px] font-bold disabled:opacity-60"
        >
          {working ? t("connecting") : t("allow")}
        </button>
        <button
          type="button"
          onClick={() => decide(false)}
          disabled={working}
          className="signin-btn justify-center disabled:opacity-60"
        >
          {t("deny")}
        </button>
      </div>
    </ConnectorAuthCard>
  );
}
