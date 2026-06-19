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
});
