"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function Navigation() {
  const t = useTranslations("common");
  const locale = useLocale();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            href={`/${locale}`}
            className="text-xl font-bold hover:opacity-80 transition-opacity"
          >
            {t("appName")}
          </Link>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
