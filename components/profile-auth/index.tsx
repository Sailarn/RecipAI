"use client";

import { Bot, LogOut, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { LoginView } from "@/components/login-view";
import { Skeleton } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { LinkedAccounts } from "./linked-accounts";
import { useLinkedAccounts } from "./use-linked-accounts";

export function ProfileAuth() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const navigate = useNavigate();
  const { locale } = useParams<{ locale: string }>();
  const { linkedProviders, telegramLinked, passkeyAdded, isLoading } =
    useLinkedAccounts(!!session);

  const handleSignIn = () =>
    navigate.push(routes.login(locale), <LoginView locale={locale} />);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
  };

  const handleLinkGoogle = async () => {
    await authClient.linkSocial({
      provider: "google",
      callbackURL: routes.profile(locale),
    });
  };

  const handleAddPasskey = async () => {
    await authClient.passkey.addPasskey();
  };

  if (isPending) {
    return (
      <div
        className="glass-card mb-3"
        style={{ borderRadius: 24, padding: "24px 16px 20px" }}
      >
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-11 w-full" style={{ borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (session) {
    const initial = (session.user.name ||
      session.user.email ||
      "?")[0].toUpperCase();

    return (
      <>
        {/* User card */}
        <div
          className="glass-card mb-3"
          style={{ borderRadius: 24, padding: "20px 16px" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginBottom: 18,
            }}
          >
            {session.user.image ? (
              // biome-ignore lint/performance/noImgElement: external avatar URL from OAuth provider
              <img
                src={session.user.image}
                alt={session.user.name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(124,58,237,0.40)",
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>
                  {initial}
                </span>
              </div>
            )}

            <p
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--fg-1)",
                textAlign: "center",
              }}
            >
              {session.user.name}
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--fg-2)",
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {session.user.email}
            </p>
          </div>

          {telegramLinked && (
            <>
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  width: "100%",
                  padding: 12,
                  background: "rgba(255,170,50,0.10)",
                  border: "1px solid rgba(255,200,100,0.22)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderRadius: 14,
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--fg-1)",
                  textDecoration: "none",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <Bot
                  size={15}
                  style={{ color: "var(--food-accent)", flexShrink: 0 }}
                />
                <span>Open Recipe Bot</span>
              </a>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: "var(--fg-3)",
                  textAlign: "center",
                  lineHeight: 1.6,
                  marginBottom: 14,
                  padding: "0 4px",
                }}
              >
                Send any recipe URL or Instagram Reel to your bot — it'll save
                it to your account automatically.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(239,68,68,0.22)",
              background: "rgba(239,68,68,0.10)",
              color: "#ef4444",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
            <span>Sign out</span>
          </button>
        </div>

        {/* Connected accounts card */}
        <LinkedAccounts
          isLoading={isLoading}
          linkedProviders={linkedProviders}
          telegramLinked={telegramLinked}
          passkeyAdded={passkeyAdded}
          onLinkGoogle={handleLinkGoogle}
          onAddPasskey={handleAddPasskey}
        />
      </>
    );
  }

  return (
    <div
      className="glass-card mb-3"
      style={{
        borderRadius: 24,
        padding: "24px 16px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <User size={28} strokeWidth={1.5} style={{ color: "var(--fg-3)" }} />
      </div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--fg-2)",
        }}
      >
        Sign in to sync your recipes across devices
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,220,120,0.35)",
          background:
            "linear-gradient(135deg, rgba(255,180,60,0.85), rgba(255,150,30,0.90))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#1a0f00",
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(255,160,40,0.30)",
          transition: "opacity 0.15s ease",
        }}
      >
        Sign in
      </button>
    </div>
  );
}
