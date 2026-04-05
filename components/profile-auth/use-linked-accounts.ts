import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function useLinkedAccounts(hasSession: boolean) {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [passkeyAdded, setPasskeyAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasSession) {
      setIsLoading(false);
      return;
    }
    Promise.all([
      authClient.listAccounts(),
      authClient.passkey.listUserPasskeys(),
    ]).then(([accountsRes, passkeysRes]) => {
      const providers = (accountsRes.data ?? []).map(
        (a: { providerId: string }) => a.providerId,
      );
      setLinkedProviders(providers);
      setTelegramLinked(
        providers.includes("telegram") || providers.includes("telegram-oidc"),
      );
      setPasskeyAdded((passkeysRes.data?.length ?? 0) > 0);
      setIsLoading(false);
    });
  }, [hasSession]);

  return {
    linkedProviders,
    telegramLinked,
    passkeyAdded,
    setPasskeyAdded,
    isLoading,
  };
}
