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

vi.mock("@/components/recipe-image", () => ({
  RecipeImage: () => <div data-testid="recipe-image" />,
}));
vi.mock("@/components/servings-calculator", () => ({
  ServingsCalculator: ({ sections }: { sections?: Recipe["sections"] }) => (
    <div
      data-testid="servings-calculator"
      data-sections={sections?.map((section) => section.name).join(",") ?? ""}
    />
  ),
}));

import { CookingCarousel } from "../index";

const recipe = {
  id: "r1",
  title: "Test Pasta",
  description: "Tasty",
  servings: 2,
  ingredients: [],
  sections: [{ id: "main", name: "Main", order: 0 }],
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
    render(<CookingCarousel recipe={recipe} locale="en" onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("closeMode"));

    expect(onClose).toHaveBeenCalled();
  });

  it("shows next (not done) on the overview slide", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);

    expect(screen.getByText("next")).toBeInTheDocument();
    expect(screen.queryByText("done")).not.toBeInTheDocument();
  });

  it("hides Prev and Ingredients on the overview slide", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);

    expect(screen.queryByText("ingredients")).not.toBeInTheDocument();
  });

  it("shows Prev and Ingredients once past the overview slide", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);

    goToSlide(1);

    expect(screen.getByText("ingredients")).toBeInTheDocument();
  });

  it("shows Done on the last step slide", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);

    goToSlide(recipe.instructions.length);

    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.queryByText("next")).not.toBeInTheDocument();
  });

  it("calls onClose when Done is clicked on the last slide", () => {
    const onClose = vi.fn();
    render(<CookingCarousel recipe={recipe} locale="en" onClose={onClose} />);

    goToSlide(recipe.instructions.length);
    fireEvent.click(screen.getByText("done"));

    expect(onClose).toHaveBeenCalled();
  });

  it("advances to the next slide when Next is clicked", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("next"));

    expect(carouselState.scrollTo).toHaveBeenCalledWith(1);
  });

  it("opens the ingredients sheet from a step slide", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);

    // The overview slide already renders one calculator; opening the sheet adds another.
    expect(screen.getAllByTestId("servings-calculator")).toHaveLength(1);

    goToSlide(1);
    fireEvent.click(screen.getByText("ingredients"));

    expect(screen.getAllByTestId("servings-calculator")).toHaveLength(2);
  });

  it("passes recipe sections to both ingredient calculators", () => {
    render(<CookingCarousel recipe={recipe} locale="en" onClose={vi.fn()} />);
    expect(screen.getByTestId("servings-calculator")).toHaveAttribute(
      "data-sections",
      "Main",
    );

    goToSlide(1);
    fireEvent.click(screen.getByText("ingredients"));

    for (const calculator of screen.getAllByTestId("servings-calculator")) {
      expect(calculator).toHaveAttribute("data-sections", "Main");
    }
  });
});
