"use client";

import { Check, KeyRound, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GoogleLogo } from "@/components/google-logo";
import { Skeleton } from "@/components/ui";
import { authClient } from "@/lib/auth/auth-client";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";

interface LinkedAccountsProps {
  linkedProviders: string[];
  telegramLinked: boolean;
  passkeyAdded: boolean;
  onLinkGoogle: () => void;
  onAddPasskey: () => void;
  isLoading: boolean;
}

export function LinkedAccounts({
  linkedProviders,
  telegramLinked,
  onLinkGoogle,
  onAddPasskey,
  passkeyAdded,
  isLoading,
}: LinkedAccountsProps) {
  const t = useTranslations("profile");
  const params = useParams();
  const locale = params.locale as string;
  const googleLinked = linkedProviders.includes("google");
  const passkeyLinked = linkedProviders.includes("passkey") || passkeyAdded;

  const handleLinkTelegramOIDC = async () => {
    trackEvent("account_linked", { provider: "telegram" });
    await authClient.linkSocial({
      provider: "telegram-oidc",
      callbackURL: routes.profile(locale),
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card mb-3 rounded-3xl overflow-hidden">
        <p className="text-xs font-semibold text-[var(--fg-3)] uppercase tracking-[0.07em] px-4 pt-[14px] pb-1.5">
          {t("connectedAccounts")}
        </p>
        <div className="px-4 pb-3.5 flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-[10px]" />
          <Skeleton className="h-12 w-full rounded-[10px]" />
          <Skeleton className="h-12 w-full rounded-[10px]" />
        </div>
      </div>
    );
  }

  const providers = [
    {
      key: "google",
      name: "Google",
      icon: <GoogleLogo size={15} />,
      isLinked: googleLinked,
      onConnect: onLinkGoogle,
    },
    {
      key: "passkey",
      name: "Passkey",
      icon: (
        <KeyRound
          size={15}
          strokeWidth={2}
          className="text-[var(--food-accent)]"
        />
      ),
      isLinked: passkeyLinked,
      onConnect: onAddPasskey,
    },
    {
      key: "telegram",
      name: "Telegram",
      icon: <Send size={15} strokeWidth={2} className="text-[#229ED9]" />,
      isLinked: telegramLinked,
      onConnect: handleLinkTelegramOIDC,
    },
  ];

  return (
    <div className="glass-card mb-3 rounded-3xl overflow-hidden">
      <p className="text-xs font-semibold text-[var(--fg-3)] uppercase tracking-[0.07em] px-4 pt-[14px] pb-1.5">
        {t("connectedAccounts")}
      </p>

      {providers.map((provider, index) => (
        <div
          key={provider.key}
          className={`flex items-center py-2.5 px-4 gap-3${index > 0 ? " border-t border-[var(--border-subtle)]" : ""}`}
        >
          <div className="w-8 h-8 rounded-[10px] bg-[rgba(0,0,0,0.28)] border border-white/[0.08] flex items-center justify-center shrink-0">
            {provider.icon}
          </div>

          <span className="font-sans text-sm text-[var(--fg-1)] flex-1">
            {provider.name}
          </span>

          {provider.isLinked ? (
            <div className="flex items-center gap-[5px]">
              <div className="w-[18px] h-[18px] rounded-full bg-green-400/[0.18] border border-green-400/[0.4] flex items-center justify-center">
                <Check size={11} className="text-green-400" />
              </div>
              <span className="font-sans text-xs text-green-400">
                {t("connected")}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={provider.onConnect}
              className="py-[5px] px-3 rounded-full bg-[rgba(255,170,50,0.10)] border border-[rgba(255,200,100,0.25)] font-sans text-xs font-semibold text-[var(--food-accent)] cursor-pointer transition-all duration-150"
            >
              {t("connect")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
