import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { routerPrefetch } = vi.hoisted(() => ({ routerPrefetch: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({ locale: "en" }),
  usePathname: vi.fn().mockReturnValue("/en/recipes"),
  useRouter: vi.fn().mockReturnValue({ prefetch: routerPrefetch }),
}));

const { useNavigationStack } = vi.hoisted(() => ({
  useNavigationStack: vi.fn(),
}));
vi.mock("@/lib/navigation-stack", () => ({ useNavigationStack }));

// Idle scheduling runs synchronously in tests so prefetch assertions don't
// need to wait on requestIdleCallback/setTimeout.
vi.mock("@/lib/schedule-idle", () => ({
  scheduleIdle: (callback: () => void) => callback(),
}));

vi.mock("next-intl", () => ({
  useTranslations: vi.fn().mockReturnValue((key: string) => key),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi.fn().mockReturnValue({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("../use-bottom-nav", () => ({
  PILL_H: 45,
  PILL_W: 74,
  MAIN_NAV_W: 260,
  useBottomNav: vi.fn().mockReturnValue({
    ready: false,
    leftMv: { set: vi.fn(), get: vi.fn() },
    measure: { itemWidths: [], itemLefts: [], innerHeight: 56 },
  }),
}));

vi.mock("../nav-pill", () => ({ NavPill: () => null }));
vi.mock("@/lib/recipes-prefetch", () => ({
  prefetchRecipesPage: vi.fn(),
  recipesPageCache: { recipes: undefined, collections: undefined },
}));

import { usePathname } from "next/navigation";
import { useNavigate } from "@/lib/transitions";
import { BottomNav } from "../index";
import { useBottomNav } from "../use-bottom-nav";

const navigate = {
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  reset: vi.fn(),
};

// Sets both usePathname() and the navigation stack's top entry to the same
// href — the "not currently pushed, viewing this route directly" case most
// tests care about. Use mockStackTop() directly when a test needs the two to
// disagree (a pushed view whose pathname sync hasn't caught up yet).
function mockRoute(href: string) {
  vi.mocked(usePathname).mockReturnValue(href);
  vi.mocked(useNavigationStack).mockReturnValue({
    entries: [{ id: "root", href, element: null }],
    push: vi.fn(),
    pop: vi.fn(),
    reset: vi.fn(),
    canPop: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useNavigate).mockReturnValue(navigate);
  mockRoute("/en/recipes");
});

describe("BottomNav — main mode", () => {
  it("renders the Recipes, AI Import, and Profile nav items", () => {
    render(<BottomNav />);
    expect(screen.getByText("recipes")).toBeInTheDocument();
    expect(screen.getByText("AI Import")).toBeInTheDocument();
    expect(screen.getByText("profile")).toBeInTheDocument();
  });

  it("renders pantry orb button in main mode", () => {
    render(<BottomNav />);
    expect(screen.getByTestId("pantry-orb")).toBeInTheDocument();
  });

  it("does not render pantry-back-orb in main mode", () => {
    render(<BottomNav />);
    expect(screen.queryByTestId("pantry-back-orb")).not.toBeInTheDocument();
  });

  it("clicking pantry orb calls navigate.push with pantry route", () => {
    render(<BottomNav />);
    fireEvent.click(screen.getByTestId("pantry-orb"));
    expect(navigate.push).toHaveBeenCalledWith("/en/pantry", expect.anything());
  });
});

describe("BottomNav — pantry mode", () => {
  it("renders pantry expanded label in pantry mode", () => {
    mockRoute("/en/pantry");
    render(<BottomNav />);
    expect(screen.getByTestId("pantry-label")).toBeInTheDocument();
  });

  it("renders back orb in pantry mode", () => {
    mockRoute("/en/pantry");
    render(<BottomNav />);
    expect(screen.getByTestId("pantry-back-orb")).toBeInTheDocument();
  });

  it("does not render AI Import in pantry mode", () => {
    mockRoute("/en/pantry");
    render(<BottomNav />);
    expect(screen.queryByText("AI Import")).not.toBeInTheDocument();
  });

  it("clicking back orb calls navigate.back with no arguments", () => {
    mockRoute("/en/pantry");
    render(<BottomNav />);
    fireEvent.click(screen.getByTestId("pantry-back-orb"));
    expect(navigate.back).toHaveBeenCalledWith();
  });
});

describe("BottomNav — visibility", () => {
  it("hides on /edit routes", () => {
    mockRoute("/en/recipes/123/edit");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("hides on /login route", () => {
    mockRoute("/en/login");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("hides on recipe detail page", () => {
    mockRoute("/en/recipes/abc123");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("hides on /parse-history route", () => {
    mockRoute("/en/parse-history");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("stays visible on /pantry route", () => {
    mockRoute("/en/pantry");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).not.toBeNull();
  });

  it("hides on a pushed recipe view even if usePathname() hasn't caught up yet", () => {
    // Simulates the deep-link regression: navigate.push() updates the stack
    // (and calls history.pushState) synchronously, but usePathname() only
    // reflects it once Next's router has processed that pushState — for that
    // window the two disagree. The stack, not the pathname, must win.
    vi.mocked(usePathname).mockReturnValue("/en/recipes");
    vi.mocked(useNavigationStack).mockReturnValue({
      entries: [
        { id: "root", href: "/en/recipes", element: null },
        { id: "detail", href: "/en/recipes/abc123", element: null },
      ],
      push: vi.fn(),
      pop: vi.fn(),
      reset: vi.fn(),
      canPop: true,
    });

    const { container } = render(<BottomNav />);

    expect(container.firstChild).toBeNull();
  });

  it("trusts usePathname() at the stack root even if its one entry is stale (tab-switch regression)", () => {
    // Regression: a plain tab tap does a real router.push (no stack push), so
    // entries stays a single root entry whose href only updates once
    // `currentPage` re-renders — usePathname() updates immediately and must
    // win here, or the active tab (and the pill's spring target) freezes on
    // the previous tab for that window.
    vi.mocked(usePathname).mockReturnValue("/en/profile");
    vi.mocked(useNavigationStack).mockReturnValue({
      entries: [{ id: "root", href: "/en/recipes", element: null }],
      push: vi.fn(),
      pop: vi.fn(),
      reset: vi.fn(),
      replaceTop: vi.fn(),
      canPop: false,
    });

    render(<BottomNav />);

    // items = [recipes, AI Import, profile] — index 2 is "profile".
    expect(useBottomNav).toHaveBeenCalledWith(
      expect.objectContaining({ staticActiveIndex: 2 }),
    );
  });
});

describe("BottomNav — position", () => {
  it("uses the CSS variable offset", () => {
    const { container } = render(<BottomNav />);

    expect(container.firstChild).toHaveClass(
      "bottom-[var(--bottom-nav-offset)]",
    );
  });
});

describe("BottomNav — prefetch", () => {
  it("idle-prefetches the other tabs' routes on mount, not the active one", () => {
    render(<BottomNav />);

    expect(routerPrefetch).toHaveBeenCalledWith("/en/recipes/parse");
    expect(routerPrefetch).toHaveBeenCalledWith("/en/profile");
    expect(routerPrefetch).not.toHaveBeenCalledWith("/en/recipes");
  });

  it("re-fires prefetch for a tab on pointer-down", () => {
    render(<BottomNav />);
    routerPrefetch.mockClear();

    fireEvent.pointerDown(screen.getByText("profile"));

    expect(routerPrefetch).toHaveBeenCalledWith("/en/profile");
  });
});
