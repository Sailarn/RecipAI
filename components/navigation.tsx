"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function Navigation() {
  const t = useTranslations("common");
  const tNav = useTranslations("navigation");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <nav
      className="border-b"
      style={{
        borderColor: "var(--nav-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href={`/${locale}`}
            className="text-xl font-bold"
            style={{
              color: "var(--foreground)",
            }}
          >
            {t("appName")}
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/recipes`}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--hover)]"
              style={{
                color: "var(--foreground)",
              }}
            >
              {tNav("recipes")}
            </Link>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
