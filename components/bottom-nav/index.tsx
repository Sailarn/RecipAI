"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { lazy, Suspense } from "react";
import { prefetchRecipesPage } from "@/lib/recipes-prefetch";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { AINavIcon, PantryIcon, ProfileIcon, RecipesIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { NavPill } from "./nav-pill";
import { PILL_H, PILL_W, useBottomNav } from "./use-bottom-nav";

// Lazy-load PantryPage to avoid circular import and reduce initial bundle
const PantryPage = lazy(() =>
  import("@/components/pantry").then((m) => ({ default: m.PantryPage })),
);

// Width constants for the two-pill layout
const MAIN_NAV_W = 260;
const PANTRY_ITEM_W = 80; // compact single-item pantry pill (both modes)

// Vertical centre of a static pill indicator inside a 48px-tall pill
const STATIC_PILL_TOP = (48 - PILL_H) / 2;

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

// Fade-in for content that just appeared (entering a new pill mode)
const fadeIn: React.CSSProperties = {
  animation: "pillContentIn 0.26s ease forwards",
  animationDelay: "0.18s",
  opacity: 0,
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
      {/* Left pill — main nav (260px) or recipes item (80px) in pantry mode */}
      <nav
        ref={!isPantryMode ? navRef : undefined}
        className="glass-nav select-none touch-none"
        style={{
          ...pillBase,
          width: isPantryMode ? PANTRY_ITEM_W : MAIN_NAV_W,
          minWidth: isPantryMode ? PANTRY_ITEM_W : MAIN_NAV_W,
          height: 48,
        }}
      >
        {isPantryMode ? (
          // Pantry mode: Recipes icon + label as nav item
          <button
            type="button"
            data-testid="pantry-back-orb"
            onClick={() => navigate.back()}
            aria-label="Back to Recipes"
            style={{ ...fadeIn, ...pantryNavItemStyle }}
          >
            <span
              style={{
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RecipesIcon />
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                lineHeight: 1,
              }}
            >
              {tNav("recipes")}
            </span>
          </button>
        ) : (
          // Main mode: full nav with pill indicator + lens
          <>
            {ready && (
              <NavPill
                leftMv={leftMv}
                yNormal={yNormal}
                isHidden={isAiActive}
              />
            )}
            {items.map((item, i) => (
              <div
                key={item.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                // Recipes tab (i === 0): seed cache as soon as the finger
                // touches, giving Dexie a head-start before navigation fires.
                onPointerDown={i === 0 ? prefetchRecipesPage : undefined}
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
          </>
        )}
      </nav>

      {/* Right pill — pantry nav item (PANTRY_ITEM_W in both modes) */}
      <div
        className="glass-nav select-none touch-none"
        style={{
          ...pillBase,
          width: PANTRY_ITEM_W,
          minWidth: PANTRY_ITEM_W,
          height: 48,
        }}
      >
        {isPantryMode ? (
          // Pantry mode: Pantry icon + label with pill indicator
          <>
            {/* Static pill indicator — same glass style as the main nav pill */}
            <div
              className="nav-pill"
              style={{
                position: "absolute",
                left: (PANTRY_ITEM_W - PILL_W) / 2,
                top: STATIC_PILL_TOP,
                width: PILL_W,
                height: PILL_H,
                borderRadius: 28,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            <div
              data-testid="pantry-label"
              style={{
                ...fadeIn,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                color: "var(--food-accent)",
                position: "relative",
                zIndex: 4,
              }}
            >
              <span
                style={{
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PantryIcon />
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1,
                }}
              >
                Pantry
              </span>
            </div>
          </>
        ) : (
          // Main mode: pantry nav item (icon + label, same layout as NavItem)
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
            style={pantryNavItemStyle}
            aria-label="Open Pantry"
          >
            <span style={pantryIconWrapStyle}>
              <PantryIcon />
            </span>
            <span style={pantryLabelStyle}>Pantry</span>
          </button>
        )}
      </div>
    </div>
  );
}

const pantryNavItemStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  color: "var(--fg-2)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  userSelect: "none",
  WebkitUserSelect: "none",
};

const pantryIconWrapStyle: React.CSSProperties = {
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const pantryLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  lineHeight: 1,
};
