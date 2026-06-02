"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { lazy, Suspense } from "react";
import { prefetchRecipesPage } from "@/lib/recipes-prefetch";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { NavColumn } from "./nav-column";
import { AINavIcon, ProfileIcon, RecipesIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { getBottomNavState } from "./nav-match";
import { NavPill } from "./nav-pill";
import { PANTRY_ITEM_W, PantryPill } from "./pantry-pill";
import { MAIN_NAV_W, PILL_H, useBottomNav } from "./use-bottom-nav";

// Lazy-load PantryPage to avoid circular import and reduce initial bundle
const PantryPage = lazy(() =>
  import("@/components/pantry").then((module) => ({
    default: module.PantryPage,
  })),
);

// CSS transition for pill width morphing (elastic overshoot)
const WIDTH_TRANSITION =
  "width 0.46s cubic-bezier(0.34, 1.4, 0.64, 1), min-width 0.46s cubic-bezier(0.34, 1.4, 0.64, 1)";

const PILL_BASE_CLASS =
  "flex items-center justify-center rounded-[28px] overflow-hidden relative shrink-0 h-12";

export function BottomNav() {
  const params = useParams();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");
  const navigate = useNavigate();
  const pathname = usePathname();

  const { shouldHide, isPantryMode, activeHref } = getBottomNavState(
    pathname,
    locale,
  );

  const items = [
    {
      href: routes.recipes.list(locale),
      label: tNav("recipes"),
      icon: RecipesIcon,
    },
    {
      href: routes.recipes.parse(locale),
      label: "AI Import",
    },
    {
      href: routes.profile(locale),
      label: tNav("profile"),
      icon: ProfileIcon,
    },
  ];

  const staticActiveIndex = Math.max(
    0,
    items.findIndex((item) => item.href === activeHref),
  );

  const { ready, leftMv, measure } = useBottomNav({
    staticActiveIndex,
    shouldHide: shouldHide || isPantryMode,
  });

  if (shouldHide) return null;

  const navH = measure?.innerHeight ?? 48;
  const yNormal = (navH - 2 - PILL_H) / 2;
  const isAiActive = staticActiveIndex === 1;

  const openPantry = () =>
    navigate.push(
      routes.pantry(locale),
      <Suspense>
        <PantryPage />
      </Suspense>,
    );

  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bottom-[calc(env(safe-area-inset-bottom)+20px)]">
      {/* Left pill — main nav (260px) or recipes item (80px) in pantry mode */}
      <nav
        className={`glass-nav select-none touch-none ${PILL_BASE_CLASS}`}
        style={{
          width: isPantryMode ? PANTRY_ITEM_W : MAIN_NAV_W,
          minWidth: isPantryMode ? PANTRY_ITEM_W : MAIN_NAV_W,
          transition: WIDTH_TRANSITION,
        }}
      >
        {isPantryMode ? (
          <button
            type="button"
            data-testid="pantry-back-orb"
            onClick={() => navigate.back()}
            aria-label="Back to Recipes"
            className="animate-[pillContentIn_0.26s_ease_0.18s_forwards] opacity-0 w-full h-full flex flex-col items-center justify-center gap-0.5 bg-transparent border-none cursor-pointer p-0 select-none text-[var(--fg-2)]"
          >
            <NavColumn icon={<RecipesIcon />} label={tNav("recipes")} />
          </button>
        ) : (
          <>
            {ready && (
              <NavPill
                leftMv={leftMv}
                yNormal={yNormal}
                isHidden={isAiActive}
              />
            )}
            {items.map((item, index) => (
              <div
                key={item.href}
                // Recipes tab (index 0): seed cache as soon as the finger
                // touches, giving Dexie a head-start before navigation fires.
                onPointerDown={index === 0 ? prefetchRecipesPage : undefined}
                className="relative flex flex-1 z-[4]"
              >
                <NavItem
                  label={item.label}
                  icon={item.icon}
                  renderIcon={
                    item.label === "AI Import"
                      ? (active) => <AINavIcon isActive={active} />
                      : undefined
                  }
                  isActive={index === staticActiveIndex}
                  onClick={() => navigate.push(item.href)}
                  hideLabelWhenActive={item.label === "AI Import"}
                />
              </div>
            ))}
          </>
        )}
      </nav>

      <PantryPill
        isPantryMode={isPantryMode}
        label="Pantry"
        onOpen={openPantry}
      />
    </div>
  );
}
