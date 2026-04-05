"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";

interface LinkedAccountsProps {
  linkedProviders: string[];
  telegramLinked: boolean;
  passkeyAdded: boolean;
  onLinkGoogle: () => void;
  onAddPasskey: () => void;
}

export function LinkedAccounts({
  linkedProviders,
  telegramLinked,
  onLinkGoogle,
  onAddPasskey,
  passkeyAdded,
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
    </div>
  );
}
