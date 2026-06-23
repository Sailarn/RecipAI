import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

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
  const inFlightRefresh = useRef<Promise<string[]> | undefined>(undefined);
  const isLoading = hasSession && !hasFetched;

  const fetchLinkedAccounts = useCallback((): Promise<string[]> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;

    const refresh = Promise.all([
      authClient.listAccounts(),
      authClient.passkey.listUserPasskeys(),
    ])
      .then(([accountsRes, passkeysRes]) => {
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
        return providers;
      })
      .catch(() => {
        setHasFetched(true);
        return _cache?.linkedProviders ?? [];
      });
    inFlightRefresh.current = refresh;
    const clearRefresh = () => {
      if (inFlightRefresh.current === refresh)
        inFlightRefresh.current = undefined;
    };
    void refresh.then(clearRefresh, clearRefresh);
    return refresh;
  }, []);

  useEffect(() => {
    if (!hasSession) {
      _cache = undefined;
      setHasFetched(false);
      return;
    }
    if (_cache !== undefined) {
      setHasFetched(true);
      return;
    }
    void fetchLinkedAccounts();
  }, [fetchLinkedAccounts, hasSession]);

  return {
    linkedProviders,
    telegramLinked,
    passkeyAdded,
    setPasskeyAdded,
    refreshLinkedAccounts: fetchLinkedAccounts,
    isLoading,
  };
}
