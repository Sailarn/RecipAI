"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { routes } from "@/lib/routes";
import { ProfileIcon, RecipesIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { NavPill } from "./nav-pill";
import { NavStyles } from "./nav-styles";

export function BottomNav() {
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");

  const hideOn = ["/recipes/new", "/recipes/parse", "/edit"];
  const isDetailPage = /\/recipes\/[^/]+$/.test(pathname);
  const shouldHide =
    hideOn.some((path) => pathname.includes(path)) || isDetailPage;

  const items = [
    {
      href: routes.recipes.list(locale),
      label: tNav("recipes"),
      icon: RecipesIcon,
      isActive: pathname.endsWith("/recipes"),
    },
    {
      href: routes.profile(locale),
      label: tNav("profile"),
      icon: ProfileIcon,
      isActive: pathname.includes("/profile"),
    },
  ];

  const activeIndex = items.findIndex((item) => item.isActive);

  // Delayed active index — updates after transition completes
  const [displayIndex, setDisplayIndex] = useState(activeIndex);

  useEffect(() => {
    const t = setTimeout(() => setDisplayIndex(activeIndex), 150);
    return () => clearTimeout(t);
  }, [activeIndex]);

  if (shouldHide) return null;

  return (
    <>
      <NavStyles />
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          viewTransitionName: "bottom-nav",
        }}
      >
        <nav className="glass-nav flex items-center rounded-2xl px-2 py-1.5">
          <div className="relative flex items-center flex-1">
            <NavPill activeIndex={displayIndex} itemCount={items.length} />
            {items.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
