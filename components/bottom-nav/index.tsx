"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useNavigationStack } from "@/lib/navigation-stack";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { DRAG_EXPAND, PILL_H } from "./nav-constants";
import { ProfileIcon, RecipesIcon } from "./nav-icons";
import { NavItem } from "./nav-item";
import { NavPill } from "./nav-pill";
import { NavStyles } from "./nav-styles";
import { useBottomNav } from "./use-bottom-nav";

// ─── Nav items ────────────────────────────────────────────────────────────────
// Add or remove items here.
// After changing item count, update PILL_W and the w-[Xpx] wrapper class below.
// See nav-constants.ts for the sizing formula and examples.
// ─────────────────────────────────────────────────────────────────────────────

export function BottomNav() {
  const params = useParams();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");
  const navigate = useNavigate();

  const { entries } = useNavigationStack();
  const currentHref = entries[entries.length - 1]?.href ?? "";

  const hideOn = ["/recipes/parse", "/edit"];
  const isDetailPage = /\/recipes\/[^/]+$/.test(currentHref);
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

  const {
    navRef,
    itemRefs,
    ready,
    leftMv,
    measure,
    isDragging,
    pendingIndex,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useBottomNav({
    staticActiveIndex,
    onNavigate: (i) => navigate.push(items[i].href),
  });

  if (shouldHide) return null;

  const displayActiveIndex = isDragging ? pendingIndex : staticActiveIndex;
  const navH = measure?.innerHeight ?? 48;
  const yNormal = (navH - PILL_H) / 2;
  const yDrag = yNormal - DRAG_EXPAND;

  return (
    <>
      <NavStyles />
      {/* w-[200px] — update this alongside PILL_W in nav-constants.ts when changing item count */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[200] w-[200px]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        <nav
          ref={navRef}
          className="glass-nav flex items-center rounded-[26px] px-0 py-px relative select-none touch-none"
          style={{ overflow: "visible" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {ready && (
            <NavPill
              leftMv={leftMv}
              isDragging={isDragging}
              yNormal={yNormal}
              yDrag={yDrag}
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
                isActive={i === displayActiveIndex}
                onClick={() => {
                  if (!isDragging) navigate.push(item.href);
                }}
              />
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
