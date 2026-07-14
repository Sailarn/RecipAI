/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecipeSection, Step } from "@/lib/db/schema";
import { InstructionsList } from "../instructions-list";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/recipe-image", () => ({
  RecipeImage: ({ title }: { title: string }) => <img alt={title} />,
}));

function steps(partial: Partial<Step>[]): Step[] {
  return partial.map((step, index) => ({
    id: `${index}`,
    order: index + 1,
    instruction: `Step ${index + 1}`,
    ...step,
  }));
}

const TWO_SECTIONS: RecipeSection[] = [
  { id: "s1", name: "For the base", order: 0 },
  { id: "s2", name: "Sauce", order: 1 },
];
const ONE_SECTION: RecipeSection[] = [{ id: "s1", name: "Sauce", order: 0 }];

describe("InstructionsList sections", () => {
  it("renders headers when steps span more than one section", () => {
    render(
      <InstructionsList
        instructions={steps([{ sectionId: "s1" }, { sectionId: "s2" }])}
        sections={TWO_SECTIONS}
      />,
    );

    expect(screen.getByText("For the base")).toBeInTheDocument();
    expect(screen.getByText("Sauce")).toBeInTheDocument();
  });

  it("renders no header for a single section", () => {
    render(
      <InstructionsList
        instructions={steps([{ sectionId: "s1" }, { sectionId: "s1" }])}
        sections={ONE_SECTION}
      />,
    );

    expect(screen.queryByText("Sauce")).not.toBeInTheDocument();
  });

  it("keeps step numbering continuous across sections", () => {
    render(
      <InstructionsList
        instructions={steps([{ sectionId: "s1" }, { sectionId: "s2" }])}
        sections={TWO_SECTIONS}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("keeps steps in cooking order when a section is interleaved (no regrouping)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <InstructionsList
        instructions={steps([
          { sectionId: "s1" },
          { sectionId: null },
          { sectionId: "s1" },
        ])}
        sections={TWO_SECTIONS}
      />,
    );

    const [one, two, three] = ["1", "2", "3"].map((label) =>
      screen.getByText(label),
    );
    expect(
      one.compareDocumentPosition(two) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      two.compareDocumentPosition(three) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // A recurring section produces two runs with the same sectionId; group keys
    // must stay unique so React does not warn / drop a run.
    const loggedMessages = errorSpy.mock.calls.map((call) => String(call[0]));
    expect(loggedMessages.some((message) => message.includes("same key"))).toBe(
      false,
    );
    errorSpy.mockRestore();
  });
});
