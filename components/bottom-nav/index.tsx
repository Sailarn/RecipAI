"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { BookIcon, GridIcon, ScanIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { NavPill } from "./nav-pill";
import { NavStyles } from "./nav-styles";

export function BottomNav() {
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");

  const items = [
    {
      href: `/${locale}/recipes`,
      label: tNav("recipes"),
      icon: BookIcon,
      isActive: pathname.endsWith("/recipes"),
    },
    {
      href: `/${locale}/recipes/parse`,
      label: "Parser",
      icon: ScanIcon,
      isActive: pathname.includes("/parse"),
    },
    {
      href: `/${locale}`,
      label: "More",
      icon: GridIcon,
      isActive: false,
    },
  ];

  const activeIndex = items.findIndex((item) => item.isActive);

  return (
    <>
      <NavStyles />

      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav className="glass-nav flex items-center rounded-2xl px-2 py-1.5">
          <div className="relative flex items-center flex-1">
            <NavPill activeIndex={activeIndex} itemCount={items.length} />
            {items.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          <div
            className="w-px h-8 mx-1 flex-shrink-0"
            style={{ background: "rgba(128,128,128,0.2)" }}
          />

          <div className="flex items-center gap-0.5 px-1 flex-shrink-0">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </nav>
      </div>
    </>
  );
}
