"use client";

import { Check, KeyRound, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
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

const chipStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

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
      <div
        className="glass-card mb-3"
        style={{ borderRadius: 24, overflow: "hidden" }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--fg-3)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "14px 16px 6px",
          }}
        >
          Connected accounts
        </p>
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton className="h-12 w-full" style={{ borderRadius: 10 }} />
          <Skeleton className="h-12 w-full" style={{ borderRadius: 10 }} />
          <Skeleton className="h-12 w-full" style={{ borderRadius: 10 }} />
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
      icon: <KeyRound size={15} strokeWidth={2} style={{ color: "var(--food-accent)" }} />,
      isLinked: passkeyLinked,
      onConnect: onAddPasskey,
    },
    {
      key: "telegram",
      name: "Telegram",
      icon: <Send size={15} strokeWidth={2} style={{ color: "#229ED9" }} />,
      isLinked: telegramLinked,
      onConnect: handleLinkTelegramOIDC,
    },
  ];

  return (
    <div
      className="glass-card mb-3"
      style={{ borderRadius: 24, overflow: "hidden" }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          padding: "14px 16px 6px",
        }}
      >
        Connected accounts
      </p>

      {providers.map((p, i) => (
        <div
          key={p.key}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            gap: 12,
            borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
          }}
        >
          <div style={chipStyle}>{p.icon}</div>

          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--fg-1)",
              flex: 1,
            }}
          >
            {p.name}
          </span>

          {p.isLinked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "rgba(74,222,128,0.18)",
                  border: "1px solid rgba(74,222,128,0.40)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={11} style={{ color: "#4ade80" }} />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "#4ade80",
                }}
              >
                Connected
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={p.onConnect}
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                background: "rgba(255,170,50,0.10)",
                border: "1px solid rgba(255,200,100,0.25)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--food-accent)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Connect
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
