"use client";

import { useEffect, useState } from "react";
import { externalAuthClient } from "@/lib/auth/external-auth-client";
import { getExternalAuthUrl } from "@/lib/auth/external-auth-config";
import { routes } from "@/lib/routes";

export function ExternalLink({ locale }: { locale: string }) {
  const [message, setMessage] = useState("Preparing secure account linking…");

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
      setMessage("This linking request is invalid.");
      return;
    }

    const begin = async () => {
      try {
        const redemption = await externalAuthClient.externalLink.redeem({
          token,
        });
        if (redemption.error) {
          setMessage("This linking request is invalid or expired.");
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
          setMessage("Google account linking could not be started.");
        }
      } catch {
        setMessage("Google account linking could not be started.");
      }
    };
    void begin();
  }, [locale]);

  return <ExternalMessage>{message}</ExternalMessage>;
}

export function ExternalLinkComplete() {
  const [message, setMessage] = useState("Finishing account linking…");
  useEffect(() => {
    const linkingFailed = new URLSearchParams(window.location.search).has(
      "error",
    );
    externalAuthClient.externalLink.cleanup().then((result) => {
      if (result.error) {
        setMessage("Browser cleanup failed. Return to RecipAI and try again.");
        return;
      }
      setMessage(
        linkingFailed
          ? "Google account was not linked. Return to RecipAI and try again."
          : "Google account linked. Return to RecipAI.",
      );
    });
  }, []);
  return <ExternalMessage>{message}</ExternalMessage>;
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
