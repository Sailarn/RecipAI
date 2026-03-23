"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const router = useRouter();
  const params = useParams();
  const currentLocale = params.locale as string;

  const toggleLocale = () => {
    const newLocale = currentLocale === "ua" ? "en" : "ua";
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(`/${currentLocale}`, `/${newLocale}`);
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
      {currentLocale === "ua" ? t("english") : t("ukrainian")}
    </button>
  );
}
