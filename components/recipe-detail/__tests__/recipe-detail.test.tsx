// components/recipe-detail/__tests__/recipe-detail.test.tsx
/**
 * @vitest-environment happy-dom
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSignedIn } from "@/lib/auth/session-state";
import { pullOwnRecipe } from "@/lib/db/pull-own-recipe";
import * as recipesModule from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { fetchPublicRecipe } from "@/lib/public-recipes/fetch-public-recipe";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { RecipeDetail } from "../index";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

// Wire onOpenChange through cancel so closing can be tested
vi.mock("@/components/ui/alert-dialog", () => {
  let _onOpenChange: ((v: boolean) => void) | undefined;
  return {
    AlertDialog: ({ children, open, onOpenChange }: any) => {
      _onOpenChange = onOpenChange;
      return open ? <div data-testid="alert-dialog">{children}</div> : null;
    },
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogAction: ({ children, onClick }: any) => (
      <button onClick={onClick} type="button">
        {children}
      </button>
    ),
    AlertDialogCancel: ({ children }: any) => (
      <button type="button" onClick={() => _onOpenChange?.(false)}>
        {children}
      </button>
    ),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: navigation.replace,
    back: vi.fn(),
  }),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({
    push: vi.fn(),
    replace: navigation.replace,
    back: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: "user-1" } } }),
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/lib/db/recipes", () => ({
  createRecipe: vi.fn(),
  getRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

vi.mock("@/lib/auth/session-state", () => ({
  isSignedIn: vi.fn(() => false),
}));

vi.mock("@/lib/db/pull-own-recipe", () => ({
  pullOwnRecipe: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/public-recipes/fetch-public-recipe", () => ({
  fetchPublicRecipe: vi.fn().mockResolvedValue(null),
}));

const telegramState = vi.hoisted(() => ({
  isTelegramEnvironment: false,
  authStatus: "idle" as "idle" | "pending" | "signed-in" | "failed",
}));

vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => ({ authStatus: telegramState.authStatus }),
}));

vi.mock("@/lib/telegram/webapp", () => ({
  isTelegramEnvironment: () => telegramState.isTelegramEnvironment,
}));

const mockRecipe: Recipe = {
  id: "recipe-1",
  title: "Chocolate Cake",
  description: "Delicious chocolate cake",
  imageUrl: "https://example.com/cake.jpg",
  prepTime: 20,
  cookTime: 40,
  totalTime: 60,
  servings: 8,
  ingredients: [
    { id: "ing-1", item: "Flour", amount: 2, unit: "cups" },
    { id: "ing-2", item: "Sugar", amount: 1, unit: "cup" },
  ],
  instructions: [
    { id: "step-1", order: 1, instruction: "Preheat oven to 350F" },
    { id: "step-2", order: 2, instruction: "Mix ingredients" },
  ],
  canonicalIngredientIds: ["ing-vocab-1", "ing-vocab-2"],
  unrecognizedIngredients: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const publicRecipe: PublicRecipe = {
  id: "shared-1",
  title: "Shared Soup",
  servings: 2,
  ingredients: [{ id: "shared-ing", item: "Water" }],
  instructions: [{ id: "shared-step", order: 1, instruction: "Boil" }],
  owner: { name: "Olena" },
};

describe("RecipeDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: recipe loads successfully
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);
    vi.mocked(recipesModule.deleteRecipe).mockResolvedValue(undefined);
    vi.mocked(recipesModule.createRecipe).mockResolvedValue("copied-1");
    vi.mocked(isSignedIn).mockReturnValue(false);
    vi.mocked(pullOwnRecipe).mockResolvedValue(null);
    vi.mocked(fetchPublicRecipe).mockResolvedValue(null);
    telegramState.isTelegramEnvironment = false;
    telegramState.authStatus = "idle";
  });

  it("shows loading state while fetching recipe", async () => {
    vi.mocked(recipesModule.getRecipe).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    expect(screen.queryByText("Chocolate Cake")).not.toBeInTheDocument();
  });

  it("renders immediately without a skeleton when seeded with initialRecipe", () => {
    vi.mocked(recipesModule.getRecipe).mockImplementation(
      () => new Promise(() => {}),
    );

    render(
      <RecipeDetail
        recipeId="recipe-1"
        locale="en"
        initialRecipe={mockRecipe}
      />,
    );

    expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
  });

  it("keeps the seeded recipe when the background Dexie read finds nothing", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);

    render(
      <RecipeDetail
        recipeId="recipe-1"
        locale="en"
        initialRecipe={mockRecipe}
      />,
    );

    await waitFor(() =>
      expect(recipesModule.getRecipe).toHaveBeenCalledWith("recipe-1"),
    );

    expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    expect(
      screen.queryByText("This recipe is private"),
    ).not.toBeInTheDocument();
  });

  it("displays the private guard when recipe does not exist", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText("This recipe is private")).toBeInTheDocument();
    });
  });

  it("displays recipe data when loaded", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    expect(screen.getByText("Delicious chocolate cake")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("displays ingredients list", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Flour/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Sugar/i)).toBeInTheDocument();
  });

  it("displays instructions in order", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Preheat oven to 350F/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Mix ingredients/i)).toBeInTheDocument();
  });

  it("opens delete dialog on delete button click", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => screen.getByText("Chocolate Cake"));

    const deleteButton = screen.getByRole("button", { name: /^delete$/i });
    await userEvent.click(deleteButton);

    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
    expect(screen.getByText(/deleteConfirmTitle/i)).toBeInTheDocument();
  });

  it("closes delete dialog on cancel", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);
    await waitFor(() => screen.getByText("Chocolate Cake"));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
    });
  });

  it("deletes recipe and navigates on confirm", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => screen.getByText("Chocolate Cake"));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByTestId("alert-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(recipesModule.deleteRecipe).toHaveBeenCalledWith("recipe-1");
    });
  });

  it("does not delete when cancel is clicked", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);
    await waitFor(() => screen.getByText("Chocolate Cake"));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(recipesModule.deleteRecipe).not.toHaveBeenCalled();
  });

  it("renders a public fallback as read-only when no local recipe exists", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);

    render(
      <RecipeDetail
        recipeId="shared-1"
        locale="en"
        publicRecipe={publicRecipe}
      />,
    );

    expect(await screen.findByText("Shared Soup")).toBeInTheDocument();
    expect(screen.getByText("Shared by Olena")).toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^edit$/i }),
    ).not.toBeInTheDocument();
  });

  it("saves an independent local copy and opens it", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
    render(
      <RecipeDetail
        recipeId="shared-1"
        locale="en"
        publicRecipe={publicRecipe}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: /save to my recipes/i }),
    );

    expect(recipesModule.createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false }),
    );
    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/en/recipes/copied-1");
    });
  });

  it("shows the private guard when neither local nor public data exists", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
    render(
      <RecipeDetail recipeId="private-1" locale="en" publicRecipe={null} />,
    );

    expect(
      await screen.findByText("This recipe is private"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to recipes/i }),
    ).toBeInTheDocument();
  });

  describe("owner pull for a not-yet-synced recipe (bot deep link)", () => {
    it("pulls the owner's recipe from the server when signed in and not on the device", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(true);

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      await waitFor(() => expect(pullOwnRecipe).toHaveBeenCalledWith("bot-1"));
    });

    it("shows a skeleton, not the private guard, while the owner pull is in flight", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(true);
      vi.mocked(pullOwnRecipe).mockImplementation(() => new Promise(() => {}));

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      await waitFor(() => expect(pullOwnRecipe).toHaveBeenCalled());
      expect(
        screen.queryByText("This recipe is private"),
      ).not.toBeInTheDocument();
    });

    it("falls back to the private guard once the owner pull finds nothing", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(true);
      vi.mocked(pullOwnRecipe).mockResolvedValue(null);

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      expect(
        await screen.findByText("This recipe is private"),
      ).toBeInTheDocument();
    });

    it("does not attempt an owner pull when signed out", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(false);

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      expect(
        await screen.findByText("This recipe is private"),
      ).toBeInTheDocument();
      expect(pullOwnRecipe).not.toHaveBeenCalled();
    });
  });

  describe("public-recipe fallback (deep link to someone else's shared recipe)", () => {
    // A Telegram deep link never carries a server-fetched `publicRecipe` prop
    // the way a fresh page load does (see components/telegram-deep-link) — so
    // opening a recipe shared by another user while already signed in to a
    // different account relies entirely on this client-side fallback.
    it("fetches and shows the public recipe when it isn't the signed-in user's own", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(true);
      vi.mocked(pullOwnRecipe).mockResolvedValue(null);
      vi.mocked(fetchPublicRecipe).mockResolvedValue(publicRecipe);

      render(<RecipeDetail recipeId="shared-1" locale="en" />);

      expect(await screen.findByText("Shared Soup")).toBeInTheDocument();
      expect(screen.getByText("Shared by Olena")).toBeInTheDocument();
      expect(fetchPublicRecipe).toHaveBeenCalledWith("shared-1");
    });

    it("fetches and shows the public recipe when signed out", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(false);
      vi.mocked(fetchPublicRecipe).mockResolvedValue(publicRecipe);

      render(<RecipeDetail recipeId="shared-1" locale="en" />);

      expect(await screen.findByText("Shared Soup")).toBeInTheDocument();
      expect(pullOwnRecipe).not.toHaveBeenCalled();
    });

    it("falls back to the private guard when it's neither owned nor public", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(true);
      vi.mocked(pullOwnRecipe).mockResolvedValue(null);
      vi.mocked(fetchPublicRecipe).mockResolvedValue(null);

      render(<RecipeDetail recipeId="nobodys-1" locale="en" />);

      expect(
        await screen.findByText("This recipe is private"),
      ).toBeInTheDocument();
    });
  });

  describe("cold Telegram launch — guard waits on auto sign-in", () => {
    it("shows a skeleton, not the private guard, while Telegram auto sign-in is still pending", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(false);
      telegramState.isTelegramEnvironment = true;
      telegramState.authStatus = "pending";

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      await waitFor(() =>
        expect(recipesModule.getRecipe).toHaveBeenCalledWith("bot-1"),
      );
      expect(
        screen.queryByText("This recipe is private"),
      ).not.toBeInTheDocument();
      expect(pullOwnRecipe).not.toHaveBeenCalled();
    });

    it("falls back to the private guard once Telegram auto sign-in fails", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      vi.mocked(isSignedIn).mockReturnValue(false);
      telegramState.isTelegramEnvironment = true;
      telegramState.authStatus = "failed";

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      expect(
        await screen.findByText("This recipe is private"),
      ).toBeInTheDocument();
    });

    it("attempts the owner pull once auto sign-in resolves to signed-in", async () => {
      vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);
      telegramState.isTelegramEnvironment = true;
      telegramState.authStatus = "signed-in";
      vi.mocked(isSignedIn).mockReturnValue(true);

      render(<RecipeDetail recipeId="bot-1" locale="en" />);

      await waitFor(() => expect(pullOwnRecipe).toHaveBeenCalledWith("bot-1"));
    });
  });
});
