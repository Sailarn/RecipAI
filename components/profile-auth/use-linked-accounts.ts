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
  // hasFetched tracks whether the API call has completed (or cache was available).
  // isLoading is DERIVED: true only when we have a session but no data yet.
  // This avoids a stale-false window when hasSession transitions false→true
  // before the useEffect fires.
  const [hasFetched, setHasFetched] = useState(_cache !== undefined);
  const isLoading = hasSession && !hasFetched;

  useEffect(() => {
    if (!hasSession) return;
    if (_cache !== undefined) {
      setHasFetched(true);
      return;
    }
    Promise.all([
      authClient.listAccounts(),
      authClient.passkey.listUserPasskeys(),
    ]).then(([accountsRes, passkeysRes]) => {
      const providers = (accountsRes.data ?? []).map(
        (account: { providerId: string }) => account.providerId,
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
      setHasFetched(true);
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
