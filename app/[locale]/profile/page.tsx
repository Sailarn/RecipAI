"use client";

import { ChevronRight, Globe, Info, Moon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ProfileAuth } from "@/components/profile-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LOCALE_DISPLAY_NAME, type Locale, locales } from "@/i18n/config";

const ROW_ICON_SIZE = 15;
const ROW_ICON_STROKE_WIDTH = 1.75;
const NAV_CLEARANCE_PX = 100;

const ROW_CLASSES =
  "flex items-center gap-2 py-3.5 px-4 bg-transparent border-none w-full text-left";

const ROW_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--font-medium)",
  color: "var(--fg-1)",
};

const ROW_ICON: React.CSSProperties = {
  color: "var(--fg-2)",
};

export default function ProfilePage() {
  const t = useTranslations("profile");
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as Locale;
  const nextLocale = locales.find((l) => l !== locale) ?? locales[0];

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPath = window.location.pathname.replace(
      `/${locale}`,
      `/${nextLocale}`,
    );
    router.push(newPath);
  };

  return (
    <div>
      <div
        className="px-4 max-w-md mx-auto"
        style={{
          paddingTop: "max(20px, calc(env(safe-area-inset-top) + 8px))",
          paddingBottom: NAV_CLEARANCE_PX,
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
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className={`${ROW_CLASSES} cursor-default`}>
            <Moon
              size={ROW_ICON_SIZE}
              strokeWidth={ROW_ICON_STROKE_WIDTH}
              className="shrink-0"
              style={ROW_ICON}
            />
            <span className="flex-1" style={ROW_LABEL}>
              {t("theme")}
            </span>
            <ThemeToggle />
          </div>

          <div
            className="h-px mx-4"
            style={{ background: "var(--border-subtle)" }}
          />

          <button
            type="button"
            onClick={toggleLanguage}
            className={`${ROW_CLASSES} cursor-pointer`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Globe
              size={ROW_ICON_SIZE}
              strokeWidth={ROW_ICON_STROKE_WIDTH}
              className="shrink-0"
              style={ROW_ICON}
            />
            <span className="flex-1" style={ROW_LABEL}>
              {t("language")}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-2)",
              }}
            >
              {LOCALE_DISPLAY_NAME[nextLocale]}
            </span>
            <ChevronRight
              size={13}
              strokeWidth={2}
              className="shrink-0"
              style={{ color: "var(--fg-3)" }}
            />
          </button>

          <div
            className="h-px mx-4"
            style={{ background: "var(--border-subtle)" }}
          />

          <div className={`${ROW_CLASSES} cursor-default`}>
            <Info
              size={ROW_ICON_SIZE}
              strokeWidth={ROW_ICON_STROKE_WIDTH}
              className="shrink-0"
              style={ROW_ICON}
            />
            <span className="flex-1" style={ROW_LABEL}>
              Version
            </span>
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
