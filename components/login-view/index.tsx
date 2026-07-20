"use client";

import { KeyRound, Send } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalAuthWaiting } from "@/components/external-auth-waiting";
import { GoogleLogo } from "@/components/google-logo";
import { useTelegram } from "@/components/telegram-provider";
import { authClient } from "@/lib/auth/auth-client";
import {
  type DeviceAuthorization,
  establishDeviceSession,
  pollDeviceAuthorization,
  requestDeviceAuthorization,
  toDeviceAuthClient,
  toDeviceSessionClient,
} from "@/lib/auth/external-auth-flow";
import { completeDeviceSignIn } from "@/lib/auth/external-browser";
import {
  clearPendingDeviceAuth,
  loadPendingDeviceAuth,
  savePendingDeviceAuth,
} from "@/lib/auth/pending-device-auth";
import { useFeature } from "@/lib/platform";
import { isStandalonePwa } from "@/lib/pwa";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";

const CHIP_CLASS =
  "w-7 h-7 rounded-lg bg-black/30 flex items-center justify-center shrink-0";

export function LoginView({ locale }: { locale: string }) {
  const navigate = useNavigate();
  const { authStatus } = useTelegram();
  const showSignInOptions = useFeature("signInOptions");
  const [externalUrl, setExternalUrl] = useState<string>();
  const [externalError, setExternalError] = useState<string>();
  const abortController = useRef<AbortController | undefined>(undefined);
  const resumedRef = useRef(false);

  const runDevicePolling = useCallback(
    async (authorization: DeviceAuthorization) => {
      setExternalError(undefined);
      setExternalUrl(authorization.verificationUrl);
      const controller = new AbortController();
      abortController.current = controller;
      try {
        const result = await pollDeviceAuthorization({
          client: toDeviceAuthClient(authClient),
          authorization,
          signal: controller.signal,
        });
        if (result.status === "authenticated") {
          await establishDeviceSession(
            toDeviceSessionClient(authClient),
            result.accessToken,
          );
          clearPendingDeviceAuth();
          completeDeviceSignIn(routes.recipes.list(locale));
        } else if (result.status === "cancelled") {
          return;
        } else {
          clearPendingDeviceAuth();
          setExternalUrl(undefined);
          setExternalError(
            `Authentication ${result.status}. Please try again.`,
          );
        }
      } catch {
        clearPendingDeviceAuth();
        setExternalUrl(undefined);
        setExternalError("Could not start Google authentication.");
      } finally {
        if (abortController.current === controller) {
          abortController.current = undefined;
        }
      }
    },
    [locale],
  );

  // Resume a device sign-in left pending by a PWA reload (e.g. returning from
  // the system browser), so the poll completes instead of dropping to login.
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const pending = loadPendingDeviceAuth();
    if (pending) void runDevicePolling(pending);
  }, [runDevicePolling]);

  useEffect(() => () => abortController.current?.abort(), []);

  const handleGoogleSignIn = async () => {
    trackEvent("login", { method: "google" });
    if (isStandalonePwa()) {
      setExternalError(undefined);
      abortController.current?.abort();
      abortController.current = undefined;
      try {
        const authorization = await requestDeviceAuthorization(
          toDeviceAuthClient(authClient),
        );
        savePendingDeviceAuth(authorization);
        void runDevicePolling(authorization);
      } catch {
        setExternalError("Could not start Google authentication.");
      }
      return;
    }
    await authClient.signIn.social({
      provider: "google",
      callbackURL: routes.recipes.list(locale),
    });
  };

  const handlePasskeySignIn = async () => {
    trackEvent("login", { method: "passkey" });
    const result = await authClient.signIn.passkey();
    if (!result?.error) {
      navigate.push(routes.recipes.list(locale));
    }
  };

  const handleTelegramSignIn = async () => {
    trackEvent("login", { method: "telegram" });
    await authClient.signInWithTelegramOIDC({
      callbackURL: routes.recipes.list(locale),
    });
  };

  // Where OAuth sign-in options aren't offered (Telegram: sign-in is silent via
  // initData), show the auto sign-in status instead of the web login buttons.
  let signInSection: React.ReactNode;
  if (!showSignInOptions) {
    signInSection = (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-sans text-sm leading-[1.5] text-[var(--fg-2)]">
          {authStatus === "failed"
            ? "We couldn't sign you in automatically. Reopen RecipAI from your Telegram chat to try again."
            : "Signing you in with Telegram…"}
        </p>
      </div>
    );
  } else if (externalUrl) {
    signInSection = (
      <ExternalAuthWaiting
        url={externalUrl}
        title="Waiting for Google"
        onCancel={() => {
          abortController.current?.abort();
          clearPendingDeviceAuth();
          setExternalUrl(undefined);
        }}
      />
    );
  } else {
    signInSection = (
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="signin-btn"
        >
          <div className={CHIP_CLASS}>
            <GoogleLogo />
          </div>
          <span>Continue with Google</span>
        </button>
        <button
          type="button"
          onClick={handlePasskeySignIn}
          className="signin-btn"
        >
          <div className={`${CHIP_CLASS} text-[var(--food-accent)]`}>
            <KeyRound size={14} strokeWidth={2} />
          </div>
          <span>Continue with Passkey</span>
        </button>
        <button
          type="button"
          onClick={handleTelegramSignIn}
          className="signin-btn"
        >
          <div className={`${CHIP_CLASS} text-[#229ED9]`}>
            <Send size={14} strokeWidth={2} />
          </div>
          <span>Continue with Telegram</span>
        </button>
        <p className="text-center text-[11px] text-[var(--fg-3)] mt-1 leading-[1.5]">
          New here? Use Google or Telegram — Passkey only works once you've
          added one to your account.
        </p>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none bg-[var(--app-mesh)]"
        aria-hidden
      />

      <div className="relative z-[1] w-[calc(100%-32px)] max-w-[360px] bg-[rgba(18,14,6,0.78)] backdrop-blur-[32px] backdrop-saturate-200 border border-[rgba(255,200,100,0.18)] rounded-[32px] px-5 pt-8 pb-7 shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,220,130,0.12)]">
        {/* Logo section */}
        <div className="text-center mb-7">
          <Image
            src="/icon-192x192.png"
            alt="RecipAI"
            width={64}
            height={64}
            priority
            className="rounded-[20px] block mx-auto mb-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.40)]"
          />
          <h1 className="font-display text-[26px] font-extrabold text-[var(--fg-1)] tracking-[-0.02em]">
            RecipAI
          </h1>
          <p className="font-sans text-xs text-[var(--fg-2)] mt-1">
            Save and discover your favourite recipes with AI
          </p>
        </div>

        {signInSection}

        {externalError && (
          <p className="text-center text-xs text-red-400 mt-3">
            {externalError}
          </p>
        )}

        <p className="text-center text-[11px] text-[var(--fg-3)] mt-[18px] leading-[1.6]">
          By continuing, you agree to our terms of service and privacy policy
        </p>
      </div>
    </main>
  );
}
