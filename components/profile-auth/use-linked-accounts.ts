import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface AccountsCache {
  linkedProviders: string[];
  telegramLinked: boolean;
  passkeyAdded: boolean;
}

let _cache: AccountsCache | undefined;

export function useLinkedAccounts(hasSession: boolean) {
  const [linkedProviders, setLinkedProviders] = useState<string[]>(
    _cache?.linkedProviders ?? [],
  );
  const [telegramLinked, setTelegramLinked] = useState(
    _cache?.telegramLinked ?? false,
  );
  const [passkeyAdded, setPasskeyAdded] = useState(
    _cache?.passkeyAdded ?? false,
  );
  const [isLoading, setIsLoading] = useState(_cache === undefined);

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
      const telegram =
        providers.includes("telegram") || providers.includes("telegram-oidc");
      const passkey = (passkeysRes.data?.length ?? 0) > 0;
      _cache = {
        linkedProviders: providers,
        telegramLinked: telegram,
        passkeyAdded: passkey,
      };
      setLinkedProviders(providers);
      setTelegramLinked(telegram);
      setPasskeyAdded(passkey);
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
