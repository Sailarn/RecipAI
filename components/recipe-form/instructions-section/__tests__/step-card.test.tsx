/** @vitest-environment happy-dom */

import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { expect, test, vi } from "vitest";
import type { RecipeFormData } from "../../schema";
import { StepCard } from "../step-card";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function StepCardHarness({
  imageUrl = "",
  onStepFileSelect = vi.fn(),
}: {
  imageUrl?: string;
  onStepFileSelect?: (stepId: string, file: File | null) => void;
}) {
  const { register, setValue } = useForm<RecipeFormData>({
    defaultValues: {
      title: "Recipe",
      servings: "2",
      ingredients: [{ item: "Flour", amount: "1" }],
      instructions: [
        { rowId: "step-1", instruction: "Mix", imageUrl, sectionId: null },
      ],
      sections: [],
    },
  });

  return (
    <StepCard
      stepId="step-1"
      index={0}
      totalSteps={1}
      imageUrl={imageUrl}
      error={false}
      register={register}
      setValue={setValue}
      onRemove={vi.fn()}
      onStepFileSelect={onStepFileSelect}
    />
  );
}

test("remove image clears the URL and pending file", () => {
  const onStepFileSelect = vi.fn();
  render(
    <StepCardHarness
      imageUrl="https://example.com/step.jpg"
      onStepFileSelect={onStepFileSelect}
    />,
  );

  expect(
    screen.getByDisplayValue("https://example.com/step.jpg"),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "removeImage" }));

  expect(
    screen.queryByDisplayValue("https://example.com/step.jpg"),
  ).not.toBeInTheDocument();
  expect(onStepFileSelect).toHaveBeenCalledWith("step-1", null);
});

test("paste selects an image even when it is not the first clipboard item", () => {
  const onStepFileSelect = vi.fn();
  const image = new File(["image"], "step.png", { type: "image/png" });
  render(<StepCardHarness onStepFileSelect={onStepFileSelect} />);

  fireEvent.click(screen.getByRole("button", { name: "addImage" }));
  fireEvent.paste(screen.getByPlaceholderText("stepImagePlaceholder"), {
    clipboardData: {
      items: [
        { type: "text/plain", getAsFile: () => null },
        { type: "image/png", getAsFile: () => image },
      ],
    },
  });

  expect(onStepFileSelect).toHaveBeenCalledWith("step-1", image);
});
