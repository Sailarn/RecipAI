import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({ locale: "en" }),
  usePathname: vi.fn().mockReturnValue("/en/recipes"),
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
    measure: { itemWidths: [], itemLefts: [], innerHeight: 48 },
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

const navigate = {
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  reset: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useNavigate).mockReturnValue(navigate);
});

describe("BottomNav — main mode", () => {
  it("renders the Recipes, AI Import, and Profile nav items", () => {
    vi.mocked(usePathname).mockReturnValue("/en/recipes");
    render(<BottomNav />);
    expect(screen.getByText("recipes")).toBeInTheDocument();
    expect(screen.getByText("AI Import")).toBeInTheDocument();
    expect(screen.getByText("profile")).toBeInTheDocument();
  });

  it("renders pantry orb button in main mode", () => {
    vi.mocked(usePathname).mockReturnValue("/en/recipes");
    render(<BottomNav />);
    expect(screen.getByTestId("pantry-orb")).toBeInTheDocument();
  });

  it("does not render pantry-back-orb in main mode", () => {
    vi.mocked(usePathname).mockReturnValue("/en/recipes");
    render(<BottomNav />);
    expect(screen.queryByTestId("pantry-back-orb")).not.toBeInTheDocument();
  });

  it("clicking pantry orb calls navigate.push with pantry route", () => {
    vi.mocked(usePathname).mockReturnValue("/en/recipes");
    render(<BottomNav />);
    fireEvent.click(screen.getByTestId("pantry-orb"));
    expect(navigate.push).toHaveBeenCalledWith("/en/pantry", expect.anything());
  });
});

describe("BottomNav — pantry mode", () => {
  it("renders pantry expanded label in pantry mode", () => {
    vi.mocked(usePathname).mockReturnValue("/en/pantry");
    render(<BottomNav />);
    expect(screen.getByTestId("pantry-label")).toBeInTheDocument();
  });

  it("renders back orb in pantry mode", () => {
    vi.mocked(usePathname).mockReturnValue("/en/pantry");
    render(<BottomNav />);
    expect(screen.getByTestId("pantry-back-orb")).toBeInTheDocument();
  });

  it("does not render AI Import in pantry mode", () => {
    vi.mocked(usePathname).mockReturnValue("/en/pantry");
    render(<BottomNav />);
    expect(screen.queryByText("AI Import")).not.toBeInTheDocument();
  });

  it("clicking back orb calls navigate.back with no arguments", () => {
    vi.mocked(usePathname).mockReturnValue("/en/pantry");
    render(<BottomNav />);
    fireEvent.click(screen.getByTestId("pantry-back-orb"));
    expect(navigate.back).toHaveBeenCalledWith();
  });
});

describe("BottomNav — visibility", () => {
  it("hides on /edit routes", () => {
    vi.mocked(usePathname).mockReturnValue("/en/recipes/123/edit");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("hides on /login route", () => {
    vi.mocked(usePathname).mockReturnValue("/en/login");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("hides on recipe detail page", () => {
    vi.mocked(usePathname).mockReturnValue("/en/recipes/abc123");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("hides on /parse-history route", () => {
    vi.mocked(usePathname).mockReturnValue("/en/parse-history");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it("stays visible on /pantry route", () => {
    vi.mocked(usePathname).mockReturnValue("/en/pantry");
    const { container } = render(<BottomNav />);
    expect(container.firstChild).not.toBeNull();
  });
});
