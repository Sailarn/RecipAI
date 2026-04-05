"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { Skeleton } from "../ui";

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
      <div className="w-full flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {linkedProviders.length > 0 && (
        <div className="text-left">
          <p className="text-xs text-muted-foreground mb-2">
            Connected accounts
          </p>
          <div className="flex flex-wrap gap-2">
            {googleLinked && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                Google
              </span>
            )}
            {telegramLinked && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                Telegram
              </span>
            )}
            {passkeyLinked && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                Passkey
              </span>
            )}
          </div>
        </div>
      )}

      {!googleLinked && (
        <Button variant="outline" className="w-full" onClick={onLinkGoogle}>
          Link Google
        </Button>
      )}
      {!passkeyLinked && (
        <Button variant="outline" className="w-full" onClick={onAddPasskey}>
          Add Passkey
        </Button>
      )}
      {!telegramLinked && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLinkTelegramOIDC}
        >
          Link Telegram
        </Button>
      )}
      {telegramLinked && (
        <a
          href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="outline" className="w-full">
            Open Recipe Bot
          </Button>
        </a>
      )}
      {telegramLinked && (
        <p className="text-xs text-muted-foreground text-center">
          Send any recipe URL or Instagram Reel to your bot — it'll save it to
          your account automatically.
        </p>
      )}
    </div>
  );
}
