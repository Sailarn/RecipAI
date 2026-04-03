import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function useLinkedAccounts(hasSession: boolean) {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [telegramLinked, setTelegramLinked] = useState(false);

  useEffect(() => {
    if (!hasSession) return;
    authClient.listAccounts().then((res) => {
      const providers = (res.data ?? []).map((a: any) => a.provider);
      setLinkedProviders(providers);
      setTelegramLinked(providers.includes("telegram"));
    });
  }, [hasSession]);

  return { linkedProviders, telegramLinked, setTelegramLinked };
}