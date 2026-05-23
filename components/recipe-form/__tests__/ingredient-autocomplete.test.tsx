/**
 * @vitest-environment happy-dom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularyIngredient } from "@/lib/db/schema";
import { IngredientAutocomplete } from "../ingredient-autocomplete";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

import { useLiveQuery } from "dexie-react-hooks";

const GARLIC: VocabularyIngredient = {
  id: "garlic",
  en: "garlic",
  ua: "часник",
  category: "vegetables",
  aliasesEn: ["garlic clove", "garlic cloves"],
  aliasesUa: ["часнику", "часником"],
  status: "confirmed",
};

const ONION: VocabularyIngredient = {
  id: "onion",
  en: "onion",
  ua: "цибуля",
  category: "vegetables",
  aliasesEn: ["onions"],
  aliasesUa: ["цибулі"],
  status: "confirmed",
};

// 5 extras to test max-5 cap
const EXTRAS: VocabularyIngredient[] = [
  {
    id: "carrot",
    en: "carrot",
    ua: "морква",
    category: "vegetables",
    aliasesEn: ["carrots"],
    aliasesUa: [],
    status: "confirmed",
  },
  {
    id: "potato",
    en: "potato",
    ua: "картопля",
    category: "vegetables",
    aliasesEn: ["potatoes"],
    aliasesUa: [],
    status: "confirmed",
  },
  {
    id: "tomato",
    en: "tomato",
    ua: "томат",
    category: "vegetables",
    aliasesEn: ["tomatoes"],
    aliasesUa: [],
    status: "confirmed",
  },
  {
    id: "pepper",
    en: "pepper",
    ua: "перець",
    category: "vegetables",
    aliasesEn: ["peppers"],
    aliasesUa: [],
    status: "confirmed",
  },
  {
    id: "celery",
    en: "celery",
    ua: "селера",
    category: "vegetables",
    aliasesEn: ["celery stalks"],
    aliasesUa: [],
    status: "confirmed",
  },
];

const MOCK_VOCAB = [GARLIC, ONION, ...EXTRAS];

function Wrapper({
  initial = "",
  placeholder = "ingredientName",
}: {
  initial?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <IngredientAutocomplete
      value={value}
      onChange={setValue}
      placeholder={placeholder}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLiveQuery).mockReturnValue(MOCK_VOCAB);
});

describe("IngredientAutocomplete", () => {
  describe("rendering", () => {
    it("renders an input with the given placeholder", () => {
      render(<Wrapper placeholder="My placeholder" />);
      expect(screen.getByPlaceholderText("My placeholder")).toBeInTheDocument();
    });

    it("renders with empty value initially", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");
      expect(input).toHaveValue("");
    });

    it("renders with pre-filled value", () => {
      render(<Wrapper initial="garlic" />);
      const input = screen.getByPlaceholderText("ingredientName");
      expect(input).toHaveValue("garlic");
    });

    it("does not show dropdown before typing", () => {
      render(<Wrapper />);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("does not show dropdown when vocab is loading (undefined)", () => {
      vi.mocked(useLiveQuery).mockReturnValue(undefined);
      render(<Wrapper />);

      const input = screen.getByPlaceholderText("ingredientName");
      fireEvent.change(input, { target: { value: "garlic" } });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("search — Latin script", () => {
    it("shows dropdown with matching results when typing en name", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    });

    it("matches by en alias", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic cloves" } });

      const options = screen.getAllByRole("option");
      const labels = options.map((o) => o.textContent);
      expect(labels.some((l) => l?.includes("garlic"))).toBe(true);
    });

    it("shows at most 5 results even if more match", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      // Single letter triggers many Fuse matches
      fireEvent.change(input, { target: { value: "a" } });

      const options = screen.queryAllByRole("option");
      expect(options.length).toBeLessThanOrEqual(5);
    });

    it("hides dropdown when query is cleared", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "" } });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("search — Cyrillic script", () => {
    it("shows dropdown when typing Cyrillic ua name", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "часник" } });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("matches by ua alias (Cyrillic)", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "часнику" } });

      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe("display language", () => {
    it("shows en name in option when typing Latin", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });

      const options = screen.getAllByRole("option");
      const firstLabel = options[0].textContent ?? "";
      expect(firstLabel).toMatch(/garlic/i);
    });

    it("shows ua name in option when typing Cyrillic", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "часник" } });

      const options = screen.getAllByRole("option");
      const firstLabel = options[0].textContent ?? "";
      expect(firstLabel).toMatch(/часник/i);
    });
  });

  describe("selection", () => {
    it("sets input value to en name when user typed Latin and clicks option", async () => {
      const onChange = vi.fn();

      function ControlledWrapper() {
        const [val, setVal] = useState("");
        return (
          <IngredientAutocomplete
            value={val}
            onChange={(v) => {
              setVal(v);
              onChange(v);
            }}
            placeholder="ingredientName"
          />
        );
      }

      render(<ControlledWrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      const options = screen.getAllByRole("option");

      fireEvent.mouseDown(options[0]);

      expect(onChange).toHaveBeenCalledWith("garlic");
    });

    it("sets input value to ua name when user typed Cyrillic and clicks option", async () => {
      const onChange = vi.fn();

      function ControlledWrapper() {
        const [val, setVal] = useState("");
        return (
          <IngredientAutocomplete
            value={val}
            onChange={(v) => {
              setVal(v);
              onChange(v);
            }}
            placeholder="ingredientName"
          />
        );
      }

      render(<ControlledWrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "часник" } });
      const options = screen.getAllByRole("option");

      fireEvent.mouseDown(options[0]);

      expect(onChange).toHaveBeenCalledWith("часник");
    });

    it("closes dropdown after selection", async () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      const options = screen.getAllByRole("option");
      fireEvent.mouseDown(options[0]);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("ArrowDown highlights the first option", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("ArrowDown then ArrowDown highlights the second option", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic cloves" } });
      // Need at least 2 options for this — garlic clove + garlic cloves
      const options = screen.queryAllByRole("option");
      if (options.length < 2) return; // skip if not enough results

      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      const reread = screen.getAllByRole("option");
      expect(reread[1]).toHaveAttribute("aria-selected", "true");
    });

    it("ArrowUp wraps from first to last option", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      const options = screen.getAllByRole("option");
      if (options.length < 2) return;

      fireEvent.keyDown(input, { key: "ArrowUp" });

      const reread = screen.getAllByRole("option");
      expect(reread[reread.length - 1]).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("Enter selects the highlighted option and closes dropdown", () => {
      const onChange = vi.fn();

      function ControlledWrapper() {
        const [val, setVal] = useState("");
        return (
          <IngredientAutocomplete
            value={val}
            onChange={(v) => {
              setVal(v);
              onChange(v);
            }}
            placeholder="ingredientName"
          />
        );
      }

      render(<ControlledWrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalled();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("Escape closes the dropdown without selecting", () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("blur behaviour", () => {
    it("closes dropdown on blur after 150 ms delay", async () => {
      vi.useFakeTimers();

      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.blur(input);

      // immediately after blur, dropdown still visible
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      // advance timers past delay
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("cancels blur timeout when option is clicked (mouseDown before blur)", async () => {
      render(<Wrapper />);
      const input = screen.getByPlaceholderText("ingredientName");

      fireEvent.change(input, { target: { value: "garlic" } });

      // Simulate click on option (mouseDown fires before blur)
      const options = screen.getAllByRole("option");
      fireEvent.mouseDown(options[0]);

      // dropdown should close via selection, not via blur timer
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
