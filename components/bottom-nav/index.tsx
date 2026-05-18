"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { AINavIcon, ProfileIcon, RecipesIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { NavLens } from "./nav-lens";
import { NavPill } from "./nav-pill";
import { PILL_H, useBottomNav } from "./use-bottom-nav";

// ─── Nav items ────────────────────────────────────────────────────────────────
// 3 items: Recipes | AI Import | Profile
// PILL_W = 74, PILL_H = 45
// NAV_W ≈ (74 + 6.5) × 3 = 241.5 → 260px wrapper
// See use-bottom-nav.ts for the sizing constants.
// ─────────────────────────────────────────────────────────────────────────────

export function BottomNav() {
  const params = useParams();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");
  const navigate = useNavigate();

  // Use the real pathname (updates synchronously with the URL) for tab
  // active-state and hide logic so the nav reflects navigation immediately,
  // even while the navigation-stack entries are being updated.
  const pathname = usePathname();
  const currentHref = pathname;

  const hideOn = ["/edit", "/login"];
  const isDetailPage =
    /\/recipes\/[^/]+$/.test(currentHref) && !currentHref.endsWith("/parse");
  const shouldHide =
    hideOn.some((p) => currentHref.includes(p)) || isDetailPage;

  const items = [
    {
      href: routes.recipes.list(locale),
      label: tNav("recipes"),
      icon: RecipesIcon,
      isActive: currentHref.endsWith("/recipes"),
    },
    {
      href: routes.recipes.parse(locale),
      label: "AI Import",
      isActive: currentHref.includes("/parse"),
    },
    {
      href: routes.profile(locale),
      label: tNav("profile"),
      icon: ProfileIcon,
      isActive: currentHref.includes("/profile"),
    },
  ];

  const staticActiveIndex = Math.max(
    0,
    items.findIndex((it) => it.isActive),
  );

  const { navRef, itemRefs, ready, leftMv, measure } = useBottomNav({
    staticActiveIndex,
    shouldHide,
  });

  if (shouldHide) return null;

  // Subtract 2px for the nav's 1px top/bottom border so the pill
  // is centered within the content area, not the border-box.
  const navH = measure?.innerHeight ?? 48;
  const yNormal = (navH - 2 - PILL_H) / 2;
  const isAiActive = staticActiveIndex === 1;

  return (
    <>
      {/* w-[260px] — 3 items × ~87px, pill 74px → ~6.5px gap each side */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[200] w-[260px]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        <nav
          ref={navRef}
          className="glass-nav flex items-center rounded-[28px] px-0 py-0 relative select-none touch-none"
          style={{ overflow: "visible" }}
        >
          {/* Pill glass indicator — z:1, below items and lens layer */}
          {ready && (
            <NavPill leftMv={leftMv} yNormal={yNormal} hidden={isAiActive} />
          )}

          {/* Lens distortion layer — z:5, clipped to pill bounds, pointer-none */}
          {ready && (
            <NavLens
              items={items}
              leftMv={leftMv}
              measure={measure}
              displayActiveIndex={staticActiveIndex}
              yNormal={yNormal}
            />
          )}

          {items.map((item, i) => (
            <div
              key={item.href}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              style={{
                zIndex: 4,
                position: "relative",
                flex: 1,
                display: "flex",
              }}
            >
              <NavItem
                label={item.label}
                icon={item.icon}
                renderIcon={
                  item.label === "AI Import"
                    ? (active) => <AINavIcon isActive={active} />
                    : undefined
                }
                isActive={i === staticActiveIndex}
                onClick={() => navigate.push(item.href)}
                hideLabelWhenActive={item.label === "AI Import"}
              />
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
