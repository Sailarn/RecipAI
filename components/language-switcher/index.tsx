"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LOCALE_DISPLAY_NAME, type Locale, locales } from "@/i18n/config";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const router = useRouter();
  const params = useParams();
  const currentLocale = params.locale as Locale;

  const nextLocale = locales.find((l) => l !== currentLocale) ?? locales[0];

  const toggleLocale = () => {
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${currentLocale}`, `/${nextLocale}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLocale}
      className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--hover)]"
      style={{
        color: "var(--foreground)",
      }}
      type="button"
      aria-label={t("switch")}
    >
      {LOCALE_DISPLAY_NAME[nextLocale]}
    </button>
  );
}
