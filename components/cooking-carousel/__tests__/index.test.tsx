import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/db/schema";

// Controllable carousel mock: captures the api the component registers via
// setApi, lets tests drive slide changes by firing the "select" handler.
const carouselState = vi.hoisted(() => ({
  selectedSnap: 0,
  selectHandler: null as null | (() => void),
  scrollTo: vi.fn(),
}));

vi.mock("@/components/ui/carousel", () => {
  const api = {
    on: (event: string, handler: () => void) => {
      if (event === "select") carouselState.selectHandler = handler;
    },
    selectedScrollSnap: () => carouselState.selectedSnap,
    scrollTo: carouselState.scrollTo,
  };
  return {
    Carousel: ({
      children,
      setApi,
    }: {
      children: React.ReactNode;
      setApi?: (api: unknown) => void;
    }) => {
      setApi?.(api);
      return <div data-testid="carousel">{children}</div>;
    },
    CarouselContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    CarouselItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

vi.mock("@/components/recipe-detail/ingredients-list", () => ({
  IngredientsList: () => <div data-testid="ingredients-list" />,
}));
vi.mock("@/components/recipe-image", () => ({
  RecipeImage: () => <div data-testid="recipe-image" />,
}));
vi.mock("@/components/servings-calculator", () => ({
  ServingsCalculator: () => <div data-testid="servings-calculator" />,
}));

import { CookingCarousel } from "../index";

const recipe = {
  id: "r1",
  title: "Test Pasta",
  description: "Tasty",
  servings: 2,
  ingredients: [],
  instructions: [
    { id: "s1", order: 1, instruction: "Boil water" },
    { id: "s2", order: 2, instruction: "Add pasta" },
  ],
} as unknown as Recipe;

/** Drive the mocked carousel to a given slide index and flush the select event. */
function goToSlide(index: number) {
  carouselState.selectedSnap = index;
  act(() => {
    carouselState.selectHandler?.();
  });
}

beforeEach(() => {
  carouselState.selectedSnap = 0;
  carouselState.selectHandler = null;
  carouselState.scrollTo.mockClear();
});

afterEach(() => {
  document.body.style.overflow = "";
});

describe("CookingCarousel", () => {
  it("calls onClose when the header close button is clicked", () => {
    const onClose = vi.fn();
    render(<CookingCarousel recipe={recipe} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close cooking mode"));

    expect(onClose).toHaveBeenCalled();
  });

  it("shows Next (not Done) on the overview slide", () => {
    render(<CookingCarousel recipe={recipe} onClose={vi.fn()} />);

    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.queryByText("Done")).not.toBeInTheDocument();
  });

  it("hides Prev and Ingredients on the overview slide", () => {
    render(<CookingCarousel recipe={recipe} onClose={vi.fn()} />);

    expect(screen.queryByText("Ingredients")).not.toBeInTheDocument();
  });

  it("shows Prev and Ingredients once past the overview slide", () => {
    render(<CookingCarousel recipe={recipe} onClose={vi.fn()} />);

    goToSlide(1);

    expect(screen.getByText("Ingredients")).toBeInTheDocument();
  });

  it("shows Done on the last step slide", () => {
    render(<CookingCarousel recipe={recipe} onClose={vi.fn()} />);

    goToSlide(recipe.instructions.length);

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("calls onClose when Done is clicked on the last slide", () => {
    const onClose = vi.fn();
    render(<CookingCarousel recipe={recipe} onClose={onClose} />);

    goToSlide(recipe.instructions.length);
    fireEvent.click(screen.getByText("Done"));

    expect(onClose).toHaveBeenCalled();
  });

  it("advances to the next slide when Next is clicked", () => {
    render(<CookingCarousel recipe={recipe} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("Next"));

    expect(carouselState.scrollTo).toHaveBeenCalledWith(1);
  });

  it("opens the ingredients sheet from a step slide", () => {
    render(<CookingCarousel recipe={recipe} onClose={vi.fn()} />);

    goToSlide(1);
    fireEvent.click(screen.getByText("Ingredients"));

    expect(screen.getByTestId("servings-calculator")).toBeInTheDocument();
  });
});
