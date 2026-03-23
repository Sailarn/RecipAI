/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as recipesModule from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import RecipesPage from "../page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({
    locale: "en",
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock database functions
vi.mock("@/lib/db/recipes", () => ({
  getAllRecipes: vi.fn(),
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
  });

  it("shows loading state while fetching recipes", () => {
    vi.mocked(recipesModule.getAllRecipes).mockReturnValue(
      new Promise(() => {}),
    );

    render(<RecipesPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no recipes exist", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue([]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText(/noRecipes/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/createFirst/i)).toBeInTheDocument();
  });

  it("displays recipe cards when recipes exist", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue(mockRecipes);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    expect(screen.getByText("Banana Bread")).toBeInTheDocument();
  });

  it("displays recipe metadata", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue(mockRecipes);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText("8 servings")).toBeInTheDocument();
    });

    expect(screen.getByText("12 servings")).toBeInTheDocument();
  });

  it("displays recipe images when available", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue(mockRecipes);

    render(<RecipesPage />);

    await waitFor(() => {
      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThan(0);
    });

    const cakeImage = screen.getByAltText("Chocolate Cake");
    expect(cakeImage).toHaveAttribute("src", "https://example.com/cake.jpg");
  });

  it("has create recipe button", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue([]);

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByText(/createRecipe/i)).toBeInTheDocument();
    });
  });

  it("links recipe cards to detail pages", async () => {
    vi.mocked(recipesModule.getAllRecipes).mockResolvedValue(mockRecipes);

    render(<RecipesPage />);

    await waitFor(() => {
      const links = screen.getAllByRole("link");
      const recipeLink = links.find((link) =>
        link.getAttribute("href")?.includes("/recipes/recipe-1"),
      );
      expect(recipeLink).toBeInTheDocument();
    });
  });
});
