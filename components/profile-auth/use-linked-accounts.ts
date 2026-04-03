import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function useLinkedAccounts(hasSession: boolean) {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [telegramLinked, setTelegramLinked] = useState(false);

  useEffect(() => {
    if (!hasSession) return;
    authClient.listAccounts().then((res) => {
      console.log("raw accounts:", JSON.stringify(res.data));
      const providers = (res.data ?? []).map((a: any) => a.providerId);
      console.log("linked providers:", providers);
      setLinkedProviders(providers);
      setTelegramLinked(
        providers.includes("telegram") || providers.includes("telegram-oidc"),
      );
    });
  }, [hasSession]);

  return { linkedProviders, telegramLinked, setTelegramLinked };
}
