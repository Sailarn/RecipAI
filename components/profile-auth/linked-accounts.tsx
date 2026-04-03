"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface LinkedAccountsProps {
    linkedProviders: string[];
    telegramLinked: boolean;
    onTelegramLinked: () => void;
    onLinkGoogle: () => void;
    onAddPasskey: () => void;
}

export function LinkedAccounts({
    linkedProviders,
    telegramLinked,
    onTelegramLinked,
    onLinkGoogle,
    onAddPasskey,
}: LinkedAccountsProps) {
    const googleLinked = linkedProviders.includes("google");
    const passkeyLinked = linkedProviders.includes("passkey");

    useEffect(() => {
        if (telegramLinked) return;
        authClient.initTelegramWidget(
            "telegram-link-container",
            { size: "medium", cornerRadius: 8 },
            async (authData) => {
                const result = await authClient.linkTelegram(authData);
                if (!result.error) onTelegramLinked();
            }
        );
    }, [telegramLinked]);

    return (
        <div className="w-full flex flex-col gap-3">
            {linkedProviders.length > 0 && (
                <div className="text-left">
                    <p className="text-xs text-muted-foreground mb-2">Connected accounts</p>
                    <div className="flex flex-wrap gap-2">
                        {googleLinked && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">Google</span>
                        )}
                        {telegramLinked && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">Telegram</span>
                        )}
                        {passkeyLinked && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted">Passkey</span>
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
                <div className="flex justify-center">
                    <div id="telegram-link-container" />
                </div>
            )}
        </div>
    );
}