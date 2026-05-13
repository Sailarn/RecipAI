/**
 * @vitest-environment happy-dom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
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
  useNavigate: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() }),
}));

import { useLiveQuery } from "dexie-react-hooks";
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
  vi.mocked(useLiveQuery)
    .mockReturnValueOnce(parsedItems)
    .mockReturnValue(syncCount);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ParsedRecipesSheet", () => {
  it("renders nothing when both parsedCount and syncCount are 0", () => {
    mockLiveQuery(0, 0);
    const { container } = render(<ParsedRecipesSheet />);
    expect(container).toBeEmptyDOMElement();
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
});
