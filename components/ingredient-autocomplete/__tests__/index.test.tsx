/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularyIngredient } from "@/lib/db/schema";
import { IngredientAutocomplete } from "../index";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

import { useLiveQuery } from "dexie-react-hooks";

const TOMATO: VocabularyIngredient = {
  id: "tomato-id",
  en: "Tomato",
  ua: "Томат",
  category: "Produce",
  aliasesEn: ["tomatoes"],
  aliasesUa: [],
  status: "confirmed",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLiveQuery).mockReturnValue([TOMATO]);
});

describe("IngredientAutocomplete — onSelect prop", () => {
  it("calls onSelect with the full vocab entry when result is clicked", () => {
    const onSelect = vi.fn();

    function Wrapper() {
      const [val, setVal] = useState("");
      return (
        <IngredientAutocomplete
          value={val}
          onChange={setVal}
          onSelect={onSelect}
          placeholder="ingredient"
        />
      );
    }

    render(<Wrapper />);
    fireEvent.change(screen.getByPlaceholderText("ingredient"), {
      target: { value: "Tom" },
    });

    const options = screen.getAllByRole("option");
    fireEvent.mouseDown(options[0]);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(TOMATO);
  });

  it("also calls onChange with display name when result is clicked", () => {
    const onChange = vi.fn();

    function Wrapper() {
      const [val, setVal] = useState("");
      return (
        <IngredientAutocomplete
          value={val}
          onChange={(v) => {
            setVal(v);
            onChange(v);
          }}
          placeholder="ingredient"
        />
      );
    }

    render(<Wrapper />);
    fireEvent.change(screen.getByPlaceholderText("ingredient"), {
      target: { value: "Tom" },
    });

    const options = screen.getAllByRole("option");
    fireEvent.mouseDown(options[0]);

    expect(onChange).toHaveBeenCalledWith("Tomato");
  });

  it("does not crash when onSelect prop is omitted", () => {
    function Wrapper() {
      const [val, setVal] = useState("");
      return (
        <IngredientAutocomplete
          value={val}
          onChange={setVal}
          placeholder="ingredient"
        />
      );
    }

    render(<Wrapper />);
    fireEvent.change(screen.getByPlaceholderText("ingredient"), {
      target: { value: "Tom" },
    });

    const options = screen.getAllByRole("option");
    expect(() => fireEvent.mouseDown(options[0])).not.toThrow();
  });
});
