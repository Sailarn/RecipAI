/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAiConnections = vi.hoisted(() => vi.fn());
const trackEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/use-ai-connections", () => ({ useAiConnections }));
vi.mock("@/lib/telemetry", () => ({ trackEvent }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/components/bottom-sheet", () => ({
  BottomSheet: ({
    title,
    children,
  }: {
    title: string;
    children: (close: () => void) => React.ReactNode;
  }) => (
    <div role="dialog" aria-label={title}>
      {children(() => {})}
    </div>
  ),
}));

import { AskAiButton } from "../index";

function connections(status: string, apps: string[] = []) {
  useAiConnections.mockReturnValue({
    status,
    connectedApps: new Set(apps),
  });
}

describe("AskAiButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("opens a menu of AI apps", () => {
    connections("ready", ["claude"]);
    render(<AskAiButton recipeId="r1" title="Borscht" />);

    const trigger = screen.getByRole("button", { name: "button" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("links a connected app to a new chat about the recipe", () => {
    connections("ready", ["claude"]);
    render(<AskAiButton recipeId="r1" title="Borscht" />);
    fireEvent.click(screen.getByRole("button", { name: "button" }));

    const item = screen.getByRole("menuitem", { name: "Claude" });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute(
      "href",
      `https://claude.ai/new?q=${encodeURIComponent("prompt")}`,
    );
    expect(item).toHaveAttribute("target", "_blank");

    fireEvent.click(item);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("prompt");
    expect(trackEvent).toHaveBeenCalledWith("ask_ai_opened", {
      app: "claude",
      connected: true,
    });
  });

  it("offers setup instead when the app isn't connected", () => {
    connections("ready", []);
    render(<AskAiButton recipeId="r1" title="Borscht" />);
    fireEvent.click(screen.getByRole("button", { name: "button" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Claude/ }));

    expect(
      screen.getByRole("dialog", { name: "connectTitle" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("goes straight to the chat while the status is still loading", () => {
    connections("loading");
    render(<AskAiButton recipeId="r1" title="Borscht" />);
    fireEvent.click(screen.getByRole("button", { name: "button" }));

    expect(screen.getByRole("menuitem", { name: "Claude" }).tagName).toBe("A");
  });

  it("closes the menu on Escape", () => {
    connections("ready", ["claude"]);
    render(<AskAiButton recipeId="r1" title="Borscht" />);
    fireEvent.click(screen.getByRole("button", { name: "button" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("lists ChatGPT next to Claude, each by its own status", () => {
    connections("ready", ["chatgpt"]);
    render(<AskAiButton recipeId="r1" title="Borscht" />);
    fireEvent.click(screen.getByRole("button", { name: "button" }));

    const chatgpt = screen.getByRole("menuitem", { name: "ChatGPT" });
    expect(chatgpt).toHaveAttribute(
      "href",
      `https://chatgpt.com/?q=${encodeURIComponent("prompt")}`,
    );
    expect(screen.getByRole("menuitem", { name: /Claude/ }).tagName).toBe(
      "BUTTON",
    );
  });
});
