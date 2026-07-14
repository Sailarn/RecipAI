import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Step } from "@/lib/db/schema";
import { StepSlide } from "../step-slide";

vi.mock("@/components/recipe-image", () => ({
  RecipeImage: () => <div data-testid="recipe-image" />,
}));

function createStep(instructionLength: number): Step {
  return {
    id: `step-${instructionLength}`,
    order: 1,
    instruction: "a".repeat(instructionLength),
  };
}

describe("StepSlide", () => {
  it.each([
    { instructionLength: 60, expectedClass: "text-[24px]" },
    { instructionLength: 61, expectedClass: "text-[20px]" },
    { instructionLength: 140, expectedClass: "text-[20px]" },
    { instructionLength: 141, expectedClass: "text-[17px]" },
    { instructionLength: 260, expectedClass: "text-[17px]" },
    { instructionLength: 261, expectedClass: "text-[14px]" },
  ])("uses $expectedClass for a $instructionLength-character instruction", ({
    instructionLength,
    expectedClass,
  }) => {
    const step = createStep(instructionLength);
    render(<StepSlide step={step} totalSteps={1} />);

    expect(screen.getByText(step.instruction)).toHaveClass(expectedClass);
  });

  it("shows the section label when the step's sectionId resolves", () => {
    const step: Step = {
      id: "s1",
      order: 1,
      instruction: "Whisk the eggs",
      sectionId: "sec-1",
    };
    const sections = [{ id: "sec-1", name: "Sauce", order: 0 }];

    render(<StepSlide step={step} totalSteps={3} sections={sections} />);

    expect(screen.getByText("Sauce")).toBeInTheDocument();
  });

  it("renders no section label when the step has none", () => {
    const step: Step = { id: "s1", order: 1, instruction: "Whisk the eggs" };

    render(<StepSlide step={step} totalSteps={3} />);

    expect(screen.getByText("Whisk the eggs")).toBeInTheDocument();
    expect(screen.queryByText("Sauce")).not.toBeInTheDocument();
  });
});
