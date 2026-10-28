/**
 * @vitest-environment happy-dom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParseNotification } from "@/lib/db/schema";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/recipe-detail", () => ({
  RecipeDetail: () => <div data-testid="recipe-detail" />,
}));

const { dismissParseNotification, push } = vi.hoisted(() => ({
  dismissParseNotification: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/db/parse-notifications", () => ({ dismissParseNotification }));
vi.mock("@/lib/db/db", () => ({ db: { parseNotifications: {} } }));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { ParseNotificationsSheet } from "../index";

const saved: ParseNotification = {
  id: "job-1",
  status: "done",
  title: "Borscht",
  recipeId: "recipe-1",
  createdAt: new Date(),
};
const failed: ParseNotification = {
  id: "job-2",
  status: "failed",
  title: "example.com",
  reason: "No recipe found",
  createdAt: new Date(),
};

function showNotifications(notifications: ParseNotification[]) {
  vi.mocked(useLiveQuery).mockReturnValue(notifications as never);
}

async function openBell() {
  render(<ParseNotificationsSheet />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dismissParseNotification.mockResolvedValue(undefined);
});

describe("ParseNotificationsSheet", () => {
  describe("bell button", () => {
    it("is disabled when there is nothing to show", () => {
      showNotifications([]);

      render(<ParseNotificationsSheet />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows the number of notifications", () => {
      showNotifications([saved, failed]);

      render(<ParseNotificationsSheet />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("sheet", () => {
    it("keeps content below the top safe area", async () => {
      showNotifications([saved]);

      await openBell();

      expect(screen.getByRole("dialog")).toHaveClass(
        "pt-[env(safe-area-inset-top)]",
        "[&_[data-slot=sheet-close]]:top-[calc(env(safe-area-inset-top)+1rem)]",
      );
    });

    it("lists saved and failed parses without Save or Edit actions", async () => {
      showNotifications([saved, failed]);

      await openBell();

      expect(screen.getByText("Borscht")).toBeInTheDocument();
      expect(screen.getByText("saved")).toBeInTheDocument();
      expect(screen.getByText("No recipe found")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^(save|edit)$/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("tapping an entry", () => {
    it("opens the saved recipe and clears the entry", async () => {
      showNotifications([saved]);
      await openBell();

      fireEvent.click(screen.getByText("Borscht"));

      expect(push).toHaveBeenCalledWith(
        "/en/recipes/recipe-1",
        expect.anything(),
      );
      expect(dismissParseNotification).toHaveBeenCalledWith("job-1");
    });

    it("opens import history for a failure", async () => {
      showNotifications([failed]);
      await openBell();

      fireEvent.click(screen.getByText("example.com"));

      expect(push).toHaveBeenCalledWith("/en/parse-history");
      expect(dismissParseNotification).toHaveBeenCalledWith("job-2");
    });
  });

  it("dismisses an entry without opening it", async () => {
    showNotifications([saved]);
    await openBell();

    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));

    expect(dismissParseNotification).toHaveBeenCalledWith("job-1");
    expect(push).not.toHaveBeenCalled();
  });
});
