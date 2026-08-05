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

vi.mock("@/lib/upload/images", () => ({
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

function mockLiveQuery(parsedCount: number) {
  const parsedItems = Array.from({ length: parsedCount }, (_, index) => ({
    id: `p${index}`,
    title: `Parsed ${index}`,
    servings: 1,
    ingredients: [],
    instructions: [],
    createdAt: new Date(),
  }));
  // The bell is driven solely by parsed recipes now (the sync-review surface was
  // retired), so the component makes a single useLiveQuery call per render.
  vi.mocked(useLiveQuery).mockReturnValue(parsedItems as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ParsedRecipesSheet", () => {
  it("renders a disabled bell button when there are no parsed recipes", () => {
    mockLiveQuery(0);
    render(<ParsedRecipesSheet />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("renders the bell button when parsed recipes exist", () => {
    mockLiveQuery(2);
    render(<ParsedRecipesSheet />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("badge shows the parsed recipe count", () => {
    mockLiveQuery(4);
    render(<ParsedRecipesSheet />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("keeps sheet content below the top safe area", async () => {
    mockLiveQuery(1);
    render(<ParsedRecipesSheet />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("dialog")).toHaveClass(
      "pt-[env(safe-area-inset-top)]",
      "[&_[data-slot=sheet-close]]:top-[calc(env(safe-area-inset-top)+1rem)]",
    );
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
      mockLiveQuery(1);
      vi.mocked(db.parsedRecipes.get).mockResolvedValue(fakeEntry as never);

      render(<ParsedRecipesSheet />);
      await openSheet();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      });

      await waitFor(() => {
        expect(saveParsedRecipe).toHaveBeenCalledWith(
          expect.objectContaining({ id: "p0" }),
          undefined,
        );
        expect(db.parsedRecipes.delete).toHaveBeenCalledWith("p0");
        expect(toast.success).toHaveBeenCalledWith("savedShort");
      });
    });

    it("Edit button deletes the entry and navigates to the new recipe form", async () => {
      mockLiveQuery(1);
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
      mockLiveQuery(1);

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
