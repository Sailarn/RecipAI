"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "ua" ? "en" : "ua";
    // Replace current locale in pathname
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      aria-label="Switch language"
    >
      {locale === "ua" ? "EN" : "UA"}
    </button>
  );
}
