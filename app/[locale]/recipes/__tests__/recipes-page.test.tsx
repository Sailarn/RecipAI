/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as recipesModule from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import RecipesPage from "../page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/db/recipes", () => ({
  getAllRecipes: vi.fn(),
}));

// useVirtualizer relies on scroll-element measurements that are always 0 in
// jsdom, so no virtual items are produced and cards never render. This mock
// returns every row as a visible item so existing card-content tests still work.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => {
    const rowH = estimateSize();
    return {
      getTotalSize: () => count * rowH,
      getVirtualItems: () =>
        Array.from({ length: count }, (_, i) => ({
          key: i,
          index: i,
          start: i * rowH,
          end: (i + 1) * rowH,
          size: rowH,
          lane: 0,
        })),
      measureElement: () => {},
    };
  },
}));

// Prevents real auth HTTP calls during page render
vi.mock("@/hooks/use-sync-on-login", () => ({
  useSyncOnLogin: () => ({ triggerSync: vi.fn() }),
}));

const mockRecipes: Recipe[] = [
  {
    id: "recipe-1",
    title: "Chocolate Cake",
    description: "Delicious chocolate cake",
    imageUrl: "https://example.com/cake.jpg",
    prepTime: 20,
    cookTime: 40,
    totalTime: 60,
    servings: 8,
    ingredients: [],
    instructions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "recipe-2",
    title: "Banana Bread",
    description: "Moist banana bread",
    servings: 12,
    ingredients: [],
    instructions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("RecipesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue(mockRecipes);
  });

  it("shows loading state while fetching recipes", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<RecipesPage />);

    expect(screen.queryByText("Chocolate Cake")).not.toBeInTheDocument();
  });

  it("shows empty state when no recipes exist", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue([]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText(/noRecipes/i)).toBeInTheDocument();
    });
  });

  it("displays recipe cards when recipes exist", async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    expect(screen.getByText("Banana Bread")).toBeInTheDocument();
  });

  it("displays recipe metadata", async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText(/8 servings/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/12 servings/i)).toBeInTheDocument();
  });

  it("displays recipe images with ImageKit transform URL", async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThan(0);
    });

    const cakeImage = screen.getByAltText("Chocolate Cake");
    expect(cakeImage).toHaveAttribute(
      "src",
      "https://example.com/cake.jpg?tr=w-300,f-webp,q-80",
    );
  });

  it("does not render create recipe button (moved to parse page)", async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.queryByText(/createRecipe/i)).not.toBeInTheDocument();
    });
  });

  it("shows noResults message when search has no matches", async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/searchPlaceholder/i);
    fireEvent.change(searchInput, { target: { value: "xyz-no-match" } });

    await waitFor(() => {
      expect(screen.getByText(/noResults/i)).toBeInTheDocument();
    });

    expect(screen.queryByText("Chocolate Cake")).not.toBeInTheDocument();
  });

  it("filters recipes when searching", async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/searchPlaceholder/i);
    fireEvent.change(searchInput, { target: { value: "banana" } });

    await waitFor(() => {
      expect(screen.queryByText("Chocolate Cake")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Banana Bread")).toBeInTheDocument();
  });
});
