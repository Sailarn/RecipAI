"use client";

import { KeyRound, Send } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalAuthWaiting } from "@/components/external-auth-waiting";
import { authClient } from "@/lib/auth/auth-client";
import {
  completeDeviceSignIn,
  type DeviceAuthorization,
  establishDeviceSession,
  pollDeviceAuthorization,
  requestDeviceAuthorization,
  toDeviceAuthClient,
  toDeviceSessionClient,
} from "@/lib/auth/external-auth-flow";
import {
  clearPendingDeviceAuth,
  loadPendingDeviceAuth,
  savePendingDeviceAuth,
} from "@/lib/auth/pending-device-auth";
import { isStandalonePwa } from "@/lib/pwa";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const CHIP_CLASS =
  "w-7 h-7 rounded-lg bg-black/30 flex items-center justify-center shrink-0";

export function LoginView({ locale }: { locale: string }) {
  const navigate = useNavigate();
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

        {externalUrl ? (
          <ExternalAuthWaiting
            url={externalUrl}
            title="Waiting for Google"
            onCancel={() => {
              abortController.current?.abort();
              clearPendingDeviceAuth();
              setExternalUrl(undefined);
            }}
          />
        ) : (
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
        )}

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
