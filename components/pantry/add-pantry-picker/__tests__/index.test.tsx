import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({ locale: "en" }),
}));

vi.mock("@/lib/db/pantry", () => ({
  addPantryItem: vi.fn().mockResolvedValue("new-id"),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/components/ingredient-picker", () => ({
  IngredientPicker: vi.fn(() => null),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { IngredientPicker } from "@/components/ingredient-picker";
import { addPantryItem } from "@/lib/db/pantry";
import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";
import { AddPantryPicker } from "../index";

const TOMATO: VocabularyIngredient = {
  id: "tomato-id",
  en: "Tomato",
  ua: "Помідор",
  category: "vegetable",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

const MILK: VocabularyIngredient = {
  id: "milk-id",
  en: "Milk",
  ua: null,
  category: "dairy",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

const milkPantryItem: PantryItem = {
  id: "p1",
  ingredientId: "milk-id",
  name: "Milk",
  qty: 1,
  unit: "pcs",
  cat: "Other",
  on: true,
  addedAt: new Date(),
};

const onClose = vi.fn();

/** The props the wrapper handed to the shared picker on its last render. */
function pickerProps() {
  const calls = vi.mocked(IngredientPicker).mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddPantryPicker", () => {
  it("renders the shared picker in multi-select pantry mode", () => {
    vi.mocked(useLiveQuery).mockReturnValue([]);
    render(<AddPantryPicker onClose={onClose} />);

    const props = pickerProps();
    expect(props.testId).toBe("add-pantry-picker");
    expect(props.title).toBe("Add to Pantry");
    expect(props.commit).toBeDefined();
  });

  it("marks ingredients already in the pantry as disabled", () => {
    vi.mocked(useLiveQuery).mockReturnValue([milkPantryItem]);
    render(<AddPantryPicker onClose={onClose} />);

    expect(pickerProps().disabledIngredientIds).toEqual(new Set(["milk-id"]));
  });

  it("labels the commit button with the selected count", () => {
    vi.mocked(useLiveQuery).mockReturnValue([]);
    render(<AddPantryPicker onClose={onClose} />);

    const { commit } = pickerProps();
    expect(commit?.label(0)).toBe("Add items to Pantry");
    expect(commit?.label(1)).toBe("Add 1 item to Pantry");
    expect(commit?.label(3)).toBe("Add 3 items to Pantry");
  });

  it("commit adds each selected ingredient to the pantry then closes", async () => {
    vi.mocked(useLiveQuery).mockReturnValue([]);
    render(<AddPantryPicker onClose={onClose} />);

    await pickerProps().commit?.onCommit([TOMATO, MILK]);

    expect(addPantryItem).toHaveBeenCalledTimes(2);
    expect(addPantryItem).toHaveBeenCalledWith({
      name: "Tomato",
      ingredientId: "tomato-id",
      on: true,
    });
    expect(addPantryItem).toHaveBeenCalledWith({
      name: "Milk",
      ingredientId: "milk-id",
      on: true,
    });
    expect(trackEvent).toHaveBeenCalledWith("pantry_item_added", undefined);
    expect(onClose).toHaveBeenCalled();
  });
});
