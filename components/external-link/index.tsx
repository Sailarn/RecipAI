"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { externalAuthClient } from "@/lib/auth/external-auth-client";
import { getExternalAuthUrl } from "@/lib/auth/external-auth-config";
import { routes } from "@/lib/routes";

// These effects hold state in *message keys*, not translated strings, so `t`
// never has to appear in their dependency arrays. It matters: both effects run
// a one-shot side effect (redeeming a link token, cleaning up the browser
// session), and `t` is not a stable reference, so depending on it re-fires them.
type LinkMessageKey =
  | "preparingLink"
  | "linkInvalid"
  | "linkInvalidOrExpired"
  | "linkStartFailed";

type CompleteMessageKey =
  | "finishingLink"
  | "cleanupFailed"
  | "linkFailedExisting"
  | "linked";

export function ExternalLink({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [messageKey, setMessageKey] = useState<LinkMessageKey>("preparingLink");

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    if (!token) {
      setMessageKey("linkInvalid");
      return;
    }

    const begin = async () => {
      try {
        const redemption = await externalAuthClient.externalLink.redeem({
          token,
        });
        if (redemption.error) {
          setMessageKey("linkInvalidOrExpired");
          return;
        }
        const externalOrigin = getExternalAuthUrl({
          configuredUrl: process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL,
        });
        const completionUrl = `${externalOrigin}${routes.externalAuth.linkComplete(locale)}`;
        const result = await externalAuthClient.linkSocial({
          provider: "google",
          callbackURL: completionUrl,
          errorCallbackURL: `${completionUrl}&error=link_failed`,
        });
        if (result.error) {
          setMessageKey("linkStartFailed");
        }
      } catch {
        setMessageKey("linkStartFailed");
      }
    };
    void begin();
  }, [locale]);

  return <ExternalMessage>{t(messageKey)}</ExternalMessage>;
}

export function ExternalLinkComplete() {
  const t = useTranslations("auth");
  const [messageKey, setMessageKey] =
    useState<CompleteMessageKey>("finishingLink");

  useEffect(() => {
    const linkingFailed = new URLSearchParams(window.location.search).has(
      "error",
    );
    externalAuthClient.externalLink.cleanup().then((result) => {
      if (result.error) {
        setMessageKey("cleanupFailed");
        return;
      }
      setMessageKey(linkingFailed ? "linkFailedExisting" : "linked");
    });
  }, []);

  return <ExternalMessage>{t(messageKey)}</ExternalMessage>;
}

function ExternalMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-[var(--app-mesh)]">
      <div className="glass-card w-full max-w-sm rounded-3xl p-6 text-center">
        {children}
      </div>
    </main>
  );
}
