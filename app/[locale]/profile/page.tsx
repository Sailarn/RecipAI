"use client";

import { ChevronRight, Globe, History, Info, Moon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ParseHistoryView } from "@/components/parse-history-view";
import { ProfileAuth } from "@/components/profile-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LOCALE_DISPLAY_NAME, type Locale, locales } from "@/i18n/config";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

const ROW_ICON_SIZE = 15;
const ROW_ICON_STROKE_WIDTH = 1.75;
const CHEVRON_ICON_SIZE = 13;
const CHEVRON_STROKE_WIDTH = 2;

const ROW_CLASSES =
  "flex items-center gap-2 py-3.5 px-4 bg-transparent border-none w-full text-left";

const ROW_LABEL_CLASSES =
  "flex-1 font-sans text-sm font-medium text-[var(--fg-1)]";
const ROW_ICON_CLASSES = "shrink-0 text-[var(--fg-2)]";

function RowDivider() {
  return <div className="h-px mx-4 bg-[var(--border-subtle)]" />;
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const params = useParams();
  const navigate = useNavigate();
  const locale = params.locale as Locale;
  const nextLocale =
    locales.find((candidateLocale) => candidateLocale !== locale) ?? locales[0];

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPath = window.location.pathname.replace(
      `/${locale}`,
      `/${nextLocale}`,
    );
    navigate.push(newPath);
  };

  return (
    <div>
      <div className="px-4 max-w-md mx-auto pt-[max(20px,calc(env(safe-area-inset-top)+8px))] pb-[100px]">
        <h1 className="mb-5 font-heading text-[26px] font-extrabold leading-tight tracking-tight text-[var(--fg-1)]">
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
              className={ROW_ICON_CLASSES}
            />
            <span className={ROW_LABEL_CLASSES}>{t("theme")}</span>
            <ThemeToggle />
          </div>

          <RowDivider />

          <button
            type="button"
            onClick={toggleLanguage}
            className={`${ROW_CLASSES} cursor-pointer [-webkit-tap-highlight-color:transparent]`}
          >
            <Globe
              size={ROW_ICON_SIZE}
              strokeWidth={ROW_ICON_STROKE_WIDTH}
              className={ROW_ICON_CLASSES}
            />
            <span className={ROW_LABEL_CLASSES}>{t("language")}</span>
            <span className="font-sans text-sm text-[var(--fg-2)]">
              {LOCALE_DISPLAY_NAME[nextLocale]}
            </span>
            <ChevronRight
              size={CHEVRON_ICON_SIZE}
              strokeWidth={CHEVRON_STROKE_WIDTH}
              className="shrink-0 text-[var(--fg-3)]"
            />
          </button>

          <RowDivider />

          <button
            type="button"
            onClick={() =>
              navigate.push(routes.parseHistory(locale), <ParseHistoryView />)
            }
            className={`${ROW_CLASSES} cursor-pointer [-webkit-tap-highlight-color:transparent]`}
          >
            <History
              size={ROW_ICON_SIZE}
              strokeWidth={ROW_ICON_STROKE_WIDTH}
              className={ROW_ICON_CLASSES}
            />
            <span className={ROW_LABEL_CLASSES}>Import history</span>
            <ChevronRight
              size={CHEVRON_ICON_SIZE}
              strokeWidth={CHEVRON_STROKE_WIDTH}
              className="shrink-0 text-[var(--fg-3)]"
            />
          </button>

          <RowDivider />

          <div className={`${ROW_CLASSES} cursor-default`}>
            <Info
              size={ROW_ICON_SIZE}
              strokeWidth={ROW_ICON_STROKE_WIDTH}
              className={ROW_ICON_CLASSES}
            />
            <span className={ROW_LABEL_CLASSES}>Version</span>
            <span className="font-sans text-sm text-[var(--fg-3)]">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
