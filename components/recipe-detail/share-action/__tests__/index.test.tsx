/** @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaintenanceError } from "@/lib/api/api-fetch";
import type { Recipe } from "@/lib/db/schema";
import { ShareAction } from "..";

const session = vi.hoisted(() => ({
  data: { user: { id: "user-1" } } as { user: { id: string } } | null,
}));
const updateRecipe = vi.hoisted(() => vi.fn());
const setRecipeVisibility = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: session.data }),
  },
}));
vi.mock("@/lib/db/recipes", () => ({ updateRecipe }));
vi.mock("@/lib/public-recipes/visibility-client", () => ({
  setRecipeVisibility,
}));
vi.mock("sonner", () => ({ toast }));

const shareRecipe = vi.hoisted(() => vi.fn());
vi.mock("@/lib/platform", () => ({
  usePlatform: () => ({ share: { recipe: shareRecipe } }),
}));

const privateRecipe: Recipe = {
  id: "recipe-1",
  title: "Soup",
  servings: 2,
  ingredients: [],
  instructions: [],
  isPublic: false,
  createdAt: new Date("2026-06-27T08:00:00.000Z"),
  updatedAt: new Date("2026-06-27T08:00:00.000Z"),
};

function renderShareAction(recipe: Recipe = privateRecipe) {
  return render(<ShareAction recipe={recipe} locale="en" />);
}

function setNavigatorProperty(name: string, value: unknown) {
  Object.defineProperty(navigator, name, {
    configurable: true,
    value,
  });
}

async function openSharePopover() {
  await userEvent.click(screen.getByRole("button", { name: "Share" }));
}

describe("ShareAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.data = { user: { id: "user-1" } };
    shareRecipe.mockResolvedValue("shared");
    setRecipeVisibility.mockResolvedValue(undefined);
    updateRecipe.mockResolvedValue(undefined);
    setNavigatorProperty("share", undefined);
    setNavigatorProperty("clipboard", {
      writeText: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows only visibility controls for a private recipe", async () => {
    renderShareAction();
    await openSharePopover();

    expect(
      screen.getByRole("dialog", { name: "Share recipe" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Public recipe" }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole("button", { name: "Copy link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "More options" }),
    ).not.toBeInTheDocument();
  });

  it("publishes before revealing share actions", async () => {
    renderShareAction();
    await openSharePopover();
    await userEvent.click(
      screen.getByRole("switch", { name: "Public recipe" }),
    );

    expect(setRecipeVisibility).toHaveBeenCalledWith(privateRecipe, true);
    expect(updateRecipe).toHaveBeenCalledWith("recipe-1", { isPublic: true });
    expect(
      await screen.findByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
  });

  it("keeps the private state when publication fails", async () => {
    setRecipeVisibility.mockRejectedValue(new Error("offline"));
    renderShareAction();
    await openSharePopover();
    await userEvent.click(
      screen.getByRole("switch", { name: "Public recipe" }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not update recipe visibility.",
      ),
    );
    expect(
      screen.getByRole("switch", { name: "Public recipe" }),
    ).not.toBeChecked();
    expect(updateRecipe).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Copy link" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the global maintenance message as the only publication error", async () => {
    setRecipeVisibility.mockRejectedValue(new MaintenanceError("Back soon"));
    renderShareAction();
    await openSharePopover();
    await userEvent.click(
      screen.getByRole("switch", { name: "Public recipe" }),
    );

    await waitFor(() => expect(setRecipeVisibility).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(updateRecipe).not.toHaveBeenCalled();
    expect(
      screen.getByRole("switch", { name: "Public recipe" }),
    ).not.toBeChecked();
  });

  it("revokes access before hiding share actions", async () => {
    renderShareAction({ ...privateRecipe, isPublic: true });
    await openSharePopover();
    await userEvent.click(
      screen.getByRole("switch", { name: "Public recipe" }),
    );

    expect(setRecipeVisibility).toHaveBeenCalledWith(
      expect.objectContaining({ id: "recipe-1", isPublic: true }),
      false,
    );
    expect(updateRecipe).toHaveBeenCalledWith("recipe-1", { isPublic: false });
    expect(
      screen.queryByRole("button", { name: "Copy link" }),
    ).not.toBeInTheDocument();
  });

  it("copies the normal recipe URL", async () => {
    renderShareAction({ ...privateRecipe, isPublic: true });
    await openSharePopover();
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringMatching(/\/en\/recipes\/recipe-1$/),
    );
    expect(
      screen.queryByRole("dialog", { name: "Share recipe" }),
    ).not.toBeInTheDocument();
  });

  it("shares the recipe via the platform from More options", async () => {
    renderShareAction({ ...privateRecipe, isPublic: true });
    await openSharePopover();
    await userEvent.click(screen.getByRole("button", { name: "More options" }));

    expect(shareRecipe).toHaveBeenCalledWith({
      id: "recipe-1",
      title: "Soup",
      url: expect.stringMatching(/\/en\/recipes\/recipe-1$/),
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Share recipe" }),
    ).not.toBeInTheDocument();
  });

  it("toasts a copied hint when the platform copied the link", async () => {
    shareRecipe.mockResolvedValue("copied");
    renderShareAction({ ...privateRecipe, isPublic: true });
    await openSharePopover();
    await userEvent.click(screen.getByRole("button", { name: "More options" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Link copied"),
    );
  });

  it("closes when the user presses outside the popover", async () => {
    renderShareAction({ ...privateRecipe, isPublic: true });
    await openSharePopover();
    expect(
      screen.getByRole("dialog", { name: "Share recipe" }),
    ).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    expect(
      screen.queryByRole("dialog", { name: "Share recipe" }),
    ).not.toBeInTheDocument();
  });

  it("closes when the user presses Escape", async () => {
    renderShareAction({ ...privateRecipe, isPublic: true });
    await openSharePopover();
    expect(
      screen.getByRole("dialog", { name: "Share recipe" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Share recipe" }),
    ).not.toBeInTheDocument();
  });

  it("disables publication for signed-out users", async () => {
    session.data = null;
    renderShareAction();
    await openSharePopover();

    expect(
      screen.getByRole("switch", { name: "Public recipe" }),
    ).toBeDisabled();
    expect(screen.getByText("Sign in to share recipes.")).toBeInTheDocument();
  });
});
