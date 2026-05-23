"use client";

import { ChevronLeft } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { lazy, Suspense } from "react";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { AINavIcon, ProfileIcon, RecipesIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { NavLens } from "./nav-lens";
import { NavPill } from "./nav-pill";
import { PILL_H, useBottomNav } from "./use-bottom-nav";

// Lazy-load PantryPage to avoid circular import and reduce initial bundle
const PantryPage = lazy(() =>
  import("@/components/pantry").then((m) => ({ default: m.PantryPage })),
);

// Width constants for the two-pill layout
const MAIN_NAV_W = 260;
const ORB_W = 60;
const PANTRY_W = 124;

// CSS transition for pill width morphing (elastic overshoot)
const WIDTH_TRANSITION =
  "width 0.46s cubic-bezier(0.34, 1.4, 0.64, 1), min-width 0.46s cubic-bezier(0.34, 1.4, 0.64, 1)";

// Shared pill glass style
const pillBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 28,
  overflow: "hidden",
  position: "relative",
  transition: WIDTH_TRANSITION,
  flexShrink: 0,
};

// Cross-fade in — content fades in after pill has started expanding
const fadeIn: React.CSSProperties = {
  animation: "pillContentIn 0.26s ease forwards",
  animationDelay: "0.18s",
  opacity: 0,
};

// Cross-fade out — content fades out quickly before pill shrinks
const fadeOut: React.CSSProperties = {
  animation: "pillContentOut 0.16s ease forwards",
};

export function BottomNav() {
  const params = useParams();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");
  const navigate = useNavigate();

  const pathname = usePathname();
  const currentHref = pathname;

  const isPantryMode = currentHref.includes("/pantry");

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
    shouldHide: shouldHide || isPantryMode,
  });

  if (shouldHide) return null;

  const navH = measure?.innerHeight ?? 48;
  const yNormal = (navH - 2 - PILL_H) / 2;
  const isAiActive = staticActiveIndex === 1;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[200]"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 20px)",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {/* Left pill — main nav (260px) or recipes back-orb (60px) */}
      <nav
        ref={!isPantryMode ? navRef : undefined}
        className="glass-nav select-none touch-none"
        style={{
          ...pillBase,
          width: isPantryMode ? ORB_W : MAIN_NAV_W,
          minWidth: isPantryMode ? ORB_W : MAIN_NAV_W,
          height: 48,
        }}
      >
        {isPantryMode ? (
          // Pantry mode: single back orb
          <button
            type="button"
            data-testid="pantry-back-orb"
            onClick={() => navigate.back(routes.recipes.list(locale))}
            style={{ ...fadeIn, ...orbButtonStyle }}
            aria-label="Back to Recipes"
          >
            <ChevronLeft size={20} style={{ color: "var(--fg-2)" }} />
          </button>
        ) : (
          // Main mode: full nav with pill indicator + lens
          <>
            {ready && (
              <NavPill leftMv={leftMv} yNormal={yNormal} hidden={isAiActive} />
            )}
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
                  ...fadeOut,
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
          </>
        )}
      </nav>

      {/* Right orb — pantry basket (60px) or pantry expanded (124px) */}
      <div
        className="glass-nav select-none touch-none"
        style={{
          ...pillBase,
          width: isPantryMode ? PANTRY_W : ORB_W,
          minWidth: isPantryMode ? PANTRY_W : ORB_W,
          height: 48,
        }}
      >
        {isPantryMode ? (
          // Pantry mode: expanded label
          <div
            data-testid="pantry-label"
            style={{
              ...fadeIn,
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingLeft: 16,
              paddingRight: 16,
              whiteSpace: "nowrap",
              color: "var(--fg-1)",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
            }}
          >
            <span style={{ fontSize: 18 }}>🧺</span>
            <span>Pantry</span>
          </div>
        ) : (
          // Main mode: pantry orb button
          <button
            type="button"
            data-testid="pantry-orb"
            onClick={() =>
              navigate.push(
                routes.pantry(locale),
                <Suspense>
                  <PantryPage />
                </Suspense>,
              )
            }
            style={{ ...fadeOut, ...orbButtonStyle }}
            aria-label="Open Pantry"
          >
            <span style={{ fontSize: 20 }}>🧺</span>
          </button>
        )}
      </div>
    </div>
  );
}

const orbButtonStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
