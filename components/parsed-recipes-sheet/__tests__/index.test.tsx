/**
 * @vitest-environment happy-dom
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db/save-parsed-recipe", () => ({
  saveParsedRecipe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/images", () => ({
  isImageKitUrl: vi.fn().mockReturnValue(true),
  uploadImage: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    parsedRecipes: {
      toArray: vi.fn(),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    notifications: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi.fn().mockReturnValue({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
  }),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import { useNavigate } from "@/lib/transitions";
import { ParsedRecipesSheet } from "../index";

function mockLiveQuery(parsedCount: number, syncCount: number) {
  const parsedItems = Array.from({ length: parsedCount }, (_, i) => ({
    id: `p${i}`,
    title: `Parsed ${i}`,
    servings: 1,
    ingredients: [],
    instructions: [],
    createdAt: new Date(),
  }));
  // Use mockImplementation (not mockReturnValueOnce) so the alternating pattern
  // survives re-renders: the component always calls useLiveQuery twice per render —
  // first for parsedRecipes (even calls), second for notifications count (odd calls).
  let callIndex = 0;
  vi.mocked(useLiveQuery).mockImplementation(() => {
    const result = callIndex % 2 === 0 ? parsedItems : syncCount;
    callIndex++;
    return result as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ParsedRecipesSheet", () => {
  it("renders a disabled bell button when both parsedCount and syncCount are 0", () => {
    mockLiveQuery(0, 0);
    render(<ParsedRecipesSheet />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("renders the bell button when only parsedCount > 0", () => {
    mockLiveQuery(2, 0);
    render(<ParsedRecipesSheet />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders the bell button when only syncCount > 0", () => {
    mockLiveQuery(0, 3);
    render(<ParsedRecipesSheet />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("badge shows total of parsedCount + syncCount", () => {
    mockLiveQuery(2, 3);
    render(<ParsedRecipesSheet />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("badge shows parsedCount when syncCount is 0", () => {
    mockLiveQuery(4, 0);
    render(<ParsedRecipesSheet />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("badge shows syncCount when parsedCount is 0", () => {
    mockLiveQuery(0, 7);
    render(<ParsedRecipesSheet />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("sync card appears in sheet when syncCount > 0", async () => {
    mockLiveQuery(0, 2);
    render(<ParsedRecipesSheet />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByText(/2 items need sync review/i)).toBeInTheDocument();
  });

  it("Review button in sync card is present when sheet is open", async () => {
    mockLiveQuery(0, 1);
    render(<ParsedRecipesSheet />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
  });

  describe("action handlers", () => {
    const fakeEntry = {
      id: "p0",
      title: "Parsed 0",
      servings: 1,
      ingredients: [],
      instructions: [],
      createdAt: new Date(),
    };

    async function openSheet() {
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
    }

    it("Save button saves the recipe, deletes the entry, and shows success toast", async () => {
      mockLiveQuery(1, 0);
      vi.mocked(db.parsedRecipes.get).mockResolvedValue(fakeEntry as never);

      render(<ParsedRecipesSheet />);
      await openSheet();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      });

      await waitFor(() => {
        expect(saveParsedRecipe).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p0" }),
        );
        expect(db.parsedRecipes.delete).toHaveBeenCalledWith("p0");
        expect(toast.success).toHaveBeenCalledWith("Recipe saved!");
      });
    });

    it("Edit button deletes the entry and navigates to the new recipe form", async () => {
      mockLiveQuery(1, 0);
      vi.mocked(db.parsedRecipes.get).mockResolvedValue(fakeEntry as never);
      const pushSpy = vi.fn();
      vi.mocked(useNavigate).mockReturnValue({
        push: pushSpy,
        back: vi.fn(),
        replace: vi.fn(),
        reset: vi.fn(),
      });

      render(<ParsedRecipesSheet />);
      await openSheet();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /edit/i }));
      });

      await waitFor(() => {
        expect(db.parsedRecipes.delete).toHaveBeenCalledWith("p0");
        expect(pushSpy).toHaveBeenCalled();
      });
    });

    it("Dismiss button deletes the entry without saving", async () => {
      mockLiveQuery(1, 0);

      render(<ParsedRecipesSheet />);
      await openSheet();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "✕" }));
      });

      await waitFor(() => {
        expect(db.parsedRecipes.delete).toHaveBeenCalledWith("p0");
        expect(saveParsedRecipe).not.toHaveBeenCalled();
      });
    });
  });
});
