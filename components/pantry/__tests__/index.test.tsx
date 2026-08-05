import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("@/lib/db/pantry", () => ({
  addPantryItem: vi.fn().mockResolvedValue("new-id"),
  removePantryItem: vi.fn().mockResolvedValue(undefined),
  togglePantryItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../add-pantry-picker", () => ({
  AddPantryPicker: () => <div data-testid="add-pantry-picker" />,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      onAnimationComplete: _onAnimationComplete,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      onAnimationComplete?: () => void;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { removePantryItem, togglePantryItem } from "@/lib/db/pantry";
import type { PantryItem } from "@/lib/db/schema";
import { PantryPage } from "../index";

const inStock: PantryItem = {
  id: "a1",
  name: "Flour",
  qty: 1,
  unit: "kg",
  cat: "Pantry",
  on: true,
  addedAt: new Date(),
};

const outOfStock: PantryItem = {
  id: "b1",
  name: "Milk",
  qty: 0,
  unit: "l",
  cat: "Dairy",
  on: false,
  addedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLiveQuery).mockReturnValue([inStock, outOfStock]);
});

describe("PantryPage", () => {
  it("renders in-stock items", () => {
    render(<PantryPage />);
    expect(screen.getByText("Flour")).toBeInTheDocument();
  });

  it("renders out-of-stock items", () => {
    render(<PantryPage />);
    expect(screen.getByText("Milk")).toBeInTheDocument();
  });

  it("shows item count subtitle", () => {
    render(<PantryPage />);
    expect(screen.getByTestId("pantry-subtitle")).toBeInTheDocument();
  });

  it("renders add button", () => {
    render(<PantryPage />);
    expect(screen.getByTestId("add-pantry-item")).toBeInTheDocument();
  });

  it("opens picker when add button is clicked", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("add-pantry-item"));
    await waitFor(() => {
      expect(screen.getByTestId("add-pantry-picker")).toBeInTheDocument();
    });
  });

  it("renders empty state when pantry is empty", () => {
    vi.mocked(useLiveQuery).mockReturnValue([]);
    render(<PantryPage />);
    expect(screen.getByTestId("pantry-empty")).toBeInTheDocument();
  });
});

describe("PantryRow", () => {
  it("calls togglePantryItem when checkbox is clicked", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("toggle-a1"));
    expect(togglePantryItem).toHaveBeenCalledWith("a1");
  });

  it("calls removePantryItem when delete button is clicked", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("delete-a1"));
    expect(removePantryItem).toHaveBeenCalledWith("a1");
  });

  it("shows toast on delete", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("delete-a1"));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("removed");
    });
  });
});
