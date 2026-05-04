"use client";

import { KeyRound, Send } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "rgba(0,0,0,0.30)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const params = useParams();
  const locale = params.locale as string;

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/recipes",
    });
  };

  const handlePasskeySignIn = async () => {
    const result = await authClient.signIn.passkey();
    if (!result?.error) {
      navigate.push(routes.recipes.list(locale));
    }
  };

  const handleTelegramSignIn = async () => {
    await authClient.signInWithTelegramOIDC({
      callbackURL: routes.recipes.list(locale),
    });
  };

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: "var(--app-mesh)" }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "calc(100% - 32px)",
          maxWidth: 360,
          background: "rgba(18,14,6,0.78)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,200,100,0.18)",
          borderRadius: 32,
          padding: "32px 20px 28px",
          boxShadow:
            "0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,220,130,0.12)",
        }}
      >
        {/* Logo section */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image
            src="/icon-192x192.png"
            alt="RecipAI"
            width={64}
            height={64}
            priority
            style={{
              borderRadius: 20,
              display: "block",
              margin: "0 auto 14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.40)",
            }}
          />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 800,
              color: "var(--fg-1)",
              letterSpacing: "-0.02em",
            }}
          >
            RecipAI
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--fg-2)",
              marginTop: 4,
            }}
          >
            Save and discover your favourite recipes with AI
          </p>
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" onClick={handleGoogleSignIn} className="signin-btn">
            <div style={chipStyle}>
              <GoogleLogo />
            </div>
            <span>Continue with Google</span>
          </button>
          <button type="button" onClick={handlePasskeySignIn} className="signin-btn">
            <div style={{ ...chipStyle, color: "var(--food-accent)" }}>
              <KeyRound size={14} strokeWidth={2} />
            </div>
            <span>Continue with Passkey</span>
          </button>
          <button type="button" onClick={handleTelegramSignIn} className="signin-btn">
            <div style={{ ...chipStyle, color: "#229ED9" }}>
              <Send size={14} strokeWidth={2} />
            </div>
            <span>Continue with Telegram</span>
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--fg-3)",
            marginTop: 18,
            lineHeight: 1.6,
          }}
        >
          By continuing, you agree to our terms of service and privacy policy
        </p>
      </div>
    </main>
  );
}
