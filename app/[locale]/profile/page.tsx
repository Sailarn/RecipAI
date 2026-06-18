"use client";

import {
  ChevronRight,
  Globe,
  History,
  Info,
  Moon,
  Smartphone,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { InstallPwaSheet } from "@/components/install-pwa-sheet";
import { ParseHistoryView } from "@/components/parse-history-view";
import { ProfileAuth } from "@/components/profile-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LOCALE_DISPLAY_NAME, type Locale, locales } from "@/i18n/config";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { PushNotificationToggle } from "./components/push-notification-toggle";
import { RowDivider } from "./components/row-divider";
import {
  CHEVRON_ICON_SIZE,
  CHEVRON_STROKE_WIDTH,
  ROW_CLASSES,
  ROW_ICON_CLASSES,
  ROW_ICON_SIZE,
  ROW_ICON_STROKE_WIDTH,
  ROW_LABEL_CLASSES,
} from "./constants";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const params = useParams();
  const navigate = useNavigate();
  const locale = params.locale as Locale;
  const nextLocale =
    locales.find((candidateLocale) => candidateLocale !== locale) ?? locales[0];
  const { showInstallOption, install, isIOS } = usePwaInstall();
  const [showInstallSheet, setShowInstallSheet] = useState(false);

  const handleInstall = async () => {
    if (isIOS) {
      setShowInstallSheet(true);
      return;
    }
    const prompted = await install();
    if (!prompted) setShowInstallSheet(true);
  };

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackEvent("language_changed", { locale: nextLocale });
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

          <PushNotificationToggle />

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

          {showInstallOption && (
            <>
              <button
                type="button"
                onClick={handleInstall}
                className={`${ROW_CLASSES} cursor-pointer [-webkit-tap-highlight-color:transparent]`}
              >
                <Smartphone
                  size={ROW_ICON_SIZE}
                  strokeWidth={ROW_ICON_STROKE_WIDTH}
                  className={ROW_ICON_CLASSES}
                />
                <span className={ROW_LABEL_CLASSES}>Add to Home Screen</span>
                <ChevronRight
                  size={CHEVRON_ICON_SIZE}
                  strokeWidth={CHEVRON_STROKE_WIDTH}
                  className="shrink-0 text-[var(--fg-3)]"
                />
              </button>
              <RowDivider />
            </>
          )}

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

      {showInstallSheet && (
        <InstallPwaSheet
          isIOS={isIOS}
          onClose={() => setShowInstallSheet(false)}
        />
      )}
    </div>
  );
}
