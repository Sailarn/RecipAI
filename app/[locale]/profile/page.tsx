"use client";

import { ChevronRight, Globe, Info, Moon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ProfileAuth } from "@/components/profile-auth";

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        cursor: "pointer",
        position: "relative",
        background: checked
          ? "rgba(255,160,40,0.30)"
          : "rgba(255,255,255,0.20)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: `1px solid ${checked ? "rgba(255,200,100,0.45)" : "rgba(255,255,255,0.30)"}`,
        boxShadow: checked ? "0 0 10px rgba(255,180,60,0.20)" : "none",
        flexShrink: 0,
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 9,
          background: checked
            ? "rgba(251,191,36,0.95)"
            : "rgba(255,255,255,0.85)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {checked ? "🌙" : "☀️"}
      </div>
    </div>
  );
}

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 16px",
  background: "transparent",
  border: "none",
  width: "100%",
  cursor: "pointer",
  textAlign: "left",
  WebkitTapHighlightColor: "transparent",
};

const ROW_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  color: "var(--fg-1)",
  flex: 1,
};

const ROW_ICON: React.CSSProperties = {
  color: "var(--fg-2)",
  flexShrink: 0,
};

const DIVIDER: React.CSSProperties = {
  height: 1,
  background: "var(--border-subtle)",
  margin: "0 16px",
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isDark;
    setIsDark(next);
    const themeName = next ? "dark" : "light";
    localStorage.setItem("theme", themeName);
    document.cookie = `theme=${themeName}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLocale = locale === "ua" ? "en" : "ua";
    const newPath = window.location.pathname.replace(
      `/${locale}`,
      `/${newLocale}`,
    );
    router.push(newPath);
  };

  const targetLanguageName = locale === "ua" ? "English" : "Українська";

  return (
    <div>
      <div
        className="px-4 max-w-md mx-auto"
        style={{
          paddingTop: "max(20px, calc(env(safe-area-inset-top) + 8px))",
          paddingBottom: 100,
        }}
      >
        <h1
          className="mb-5"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 26,
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
            color: "var(--fg-1)",
          }}
        >
          {t("title")}
        </h1>

        {/* Auth cards — ProfileAuth renders its own glass cards */}
        <ProfileAuth />

        {/* Settings card */}
        <div
          className="glass-card"
          style={{ borderRadius: 24, overflow: "hidden" }}
        >
          <button type="button" onClick={toggleTheme} style={ROW}>
            <Moon size={15} strokeWidth={1.75} style={ROW_ICON} />
            <span style={ROW_LABEL}>{t("theme")}</span>
            <Toggle checked={isDark} />
          </button>

          <div style={DIVIDER} />

          <button type="button" onClick={toggleLanguage} style={ROW}>
            <Globe size={15} strokeWidth={1.75} style={ROW_ICON} />
            <span style={ROW_LABEL}>{t("language")}</span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-2)",
              }}
            >
              {targetLanguageName}
            </span>
            <ChevronRight
              size={13}
              strokeWidth={2}
              style={{ color: "var(--fg-3)", flexShrink: 0 }}
            />
          </button>

          <div style={DIVIDER} />

          <div style={{ ...ROW, cursor: "default" }}>
            <Info size={15} strokeWidth={1.75} style={ROW_ICON} />
            <span style={ROW_LABEL}>Version</span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-3)",
              }}
            >
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
