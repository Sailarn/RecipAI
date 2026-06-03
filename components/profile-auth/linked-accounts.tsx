"use client";

import { Check, KeyRound, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { authClient } from "@/lib/auth/auth-client";
import { routes } from "@/lib/routes";

interface LinkedAccountsProps {
  linkedProviders: string[];
  telegramLinked: boolean;
  passkeyAdded: boolean;
  onLinkGoogle: () => void;
  onAddPasskey: () => void;
  isLoading: boolean;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
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

export function LinkedAccounts({
  linkedProviders,
  telegramLinked,
  onLinkGoogle,
  onAddPasskey,
  passkeyAdded,
  isLoading,
}: LinkedAccountsProps) {
  const params = useParams();
  const locale = params.locale as string;
  const googleLinked = linkedProviders.includes("google");
  const passkeyLinked = linkedProviders.includes("passkey") || passkeyAdded;

  const handleLinkTelegramOIDC = async () => {
    await authClient.linkSocial({
      provider: "telegram-oidc",
      callbackURL: routes.profile(locale),
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card mb-3 rounded-3xl overflow-hidden">
        <p className="text-xs font-semibold text-[var(--fg-3)] uppercase tracking-[0.07em] px-4 pt-[14px] pb-1.5">
          Connected accounts
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
      icon: <GoogleIcon />,
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
        Connected accounts
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
                Connected
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={provider.onConnect}
              className="py-[5px] px-3 rounded-full bg-[rgba(255,170,50,0.10)] border border-[rgba(255,200,100,0.25)] font-sans text-xs font-semibold text-[var(--food-accent)] cursor-pointer transition-all duration-150"
            >
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
