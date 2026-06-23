"use client";

import { User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalAuthWaiting } from "@/components/external-auth-waiting";
import { LoginView } from "@/components/login-view";
import { Skeleton } from "@/components/ui";
import { authClient } from "@/lib/auth/auth-client";
import {
  assertSeparateAuthOrigins,
  EXTERNAL_AUTH_TTL_MS,
  getExternalAuthUrl,
} from "@/lib/auth/external-auth-config";
import { openExternalAuth } from "@/lib/auth/external-auth-flow";
import { isStandalonePwa } from "@/lib/pwa";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { LinkedAccounts } from "./linked-accounts";
import { useLinkedAccounts } from "./use-linked-accounts";
import { UserCard } from "./user-card";

export function ProfileAuth() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const navigate = useNavigate();
  const { locale } = useParams<{ locale: string }>();
  const {
    linkedProviders,
    telegramLinked,
    passkeyAdded,
    isLoading,
    refreshLinkedAccounts,
  } = useLinkedAccounts(!!session);
  const [externalLinkUrl, setExternalLinkUrl] = useState<string>();
  const [externalLinkError, setExternalLinkError] = useState<string>();
  const linkPolling = useRef<number | undefined>(undefined);
  const linkTimeout = useRef<number | undefined>(undefined);

  const stopLinkPolling = useCallback(() => {
    if (linkPolling.current) window.clearInterval(linkPolling.current);
    if (linkTimeout.current) window.clearTimeout(linkTimeout.current);
    linkPolling.current = undefined;
    linkTimeout.current = undefined;
  }, []);

  useEffect(
    () => () => {
      stopLinkPolling();
    },
    [stopLinkPolling],
  );

  useEffect(() => {
    if (!externalLinkUrl) return;
    const refreshOnFocus = () => void refreshLinkedAccounts();
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [externalLinkUrl, refreshLinkedAccounts]);

  const handleSignIn = () =>
    navigate.push(routes.login(locale), <LoginView locale={locale} />);

  const handleSignOut = async () => {
    trackEvent("logout", undefined);
    await authClient.signOut();
    router.refresh();
  };

  const handleLinkGoogle = async () => {
    trackEvent("account_linked", { provider: "google" });
    if (isStandalonePwa()) {
      setExternalLinkError(undefined);
      try {
        const externalOrigin = getExternalAuthUrl({
          configuredUrl: process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL,
        });
        assertSeparateAuthOrigins(window.location.origin, externalOrigin);
        const response = await authClient.externalLink.generate();
        if (!response.data?.token) {
          throw new Error("Missing account-link token");
        }
        const url = `${externalOrigin}${routes.externalAuth.link(locale)}#token=${encodeURIComponent(response.data.token)}`;
        setExternalLinkUrl(url);
        openExternalAuth(url);
        linkPolling.current = window.setInterval(async () => {
          const providers = await refreshLinkedAccounts();
          if (providers.includes("google")) {
            stopLinkPolling();
            setExternalLinkUrl(undefined);
          }
        }, 5000);
        linkTimeout.current = window.setTimeout(() => {
          stopLinkPolling();
          setExternalLinkUrl(undefined);
          setExternalLinkError("Account linking expired. Please try again.");
        }, EXTERNAL_AUTH_TTL_MS);
      } catch {
        stopLinkPolling();
        setExternalLinkUrl(undefined);
        setExternalLinkError("Could not start Google account linking.");
      }
      return;
    }
    await authClient.linkSocial({
      provider: "google",
      callbackURL: routes.profile(locale),
    });
  };

  const handleAddPasskey = async () => {
    trackEvent("account_linked", { provider: "passkey" });
    await authClient.passkey.addPasskey();
  };

  // Hold the full skeleton until both session and linked-accounts data are ready.
  // This prevents the Telegram bot button (and other account-state-dependent UI)
  // from popping in after a partial render.
  if (isPending || (!!session && isLoading)) {
    return (
      <>
        <div className="glass-card mb-3 rounded-3xl px-4 py-5">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-10 w-full rounded-[14px]" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-11 w-full rounded-[14px]" />
          </div>
        </div>
        <LinkedAccounts
          isLoading
          linkedProviders={[]}
          telegramLinked={false}
          passkeyAdded={false}
          onLinkGoogle={() => {}}
          onAddPasskey={() => {}}
        />
      </>
    );
  }

  if (session) {
    return (
      <div className="animate-[fade-in_200ms_ease]">
        <UserCard
          user={session.user}
          telegramLinked={telegramLinked}
          onSignOut={handleSignOut}
        />
        {externalLinkUrl && (
          <div className="glass-card mb-3 rounded-3xl p-5">
            <ExternalAuthWaiting
              url={externalLinkUrl}
              title="Waiting for Google"
              onCancel={() => {
                stopLinkPolling();
                setExternalLinkUrl(undefined);
              }}
            />
          </div>
        )}
        {externalLinkError && (
          <p className="mb-3 text-center text-xs text-red-400">
            {externalLinkError}
          </p>
        )}
        <LinkedAccounts
          isLoading={isLoading}
          linkedProviders={linkedProviders}
          telegramLinked={telegramLinked}
          passkeyAdded={passkeyAdded}
          onLinkGoogle={handleLinkGoogle}
          onAddPasskey={handleAddPasskey}
        />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_200ms_ease] glass-card mb-3 rounded-3xl px-4 pt-6 pb-5 flex flex-col items-center gap-[14px] text-center">
      <div className="w-16 h-16 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center">
        <User size={28} strokeWidth={1.5} className="text-[var(--fg-3)]" />
      </div>
      <p className="font-sans text-sm leading-[1.5] text-[var(--fg-2)]">
        Sign in to sync your recipes across devices
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        className="w-full p-3.5 rounded-[14px] border border-[rgba(255,220,120,0.35)] bg-[linear-gradient(135deg,rgba(255,180,60,0.85),rgba(255,150,30,0.90))] backdrop-blur-[12px] text-[#1a0f00] font-sans text-[15px] font-bold cursor-pointer shadow-[0_4px_18px_rgba(255,160,40,0.30)] transition-opacity duration-150"
      >
        Sign in
      </button>
    </div>
  );
}
