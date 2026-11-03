/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { ConnectAiSheet } from "../connect-sheet";

describe("ConnectAiSheet", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL =
      "https://recip-ai-wine.vercel.app";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows the connector URL and copies it", async () => {
    render(<ConnectAiSheet app="claude" onClose={vi.fn()} />);

    expect(
      screen.getByText("https://recip-ai-wine.vercel.app/api/mcp"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "copyUrl" }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://recip-ai-wine.vercel.app/api/mcp",
      ),
    );
  });

  it("links to the app's connector settings and, optionally, a chat", () => {
    render(
      <ConnectAiSheet
        app="claude"
        chatUrl="https://claude.ai/new?q=x"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "openSettings" })).toHaveAttribute(
      "href",
      "https://claude.ai/settings/connectors",
    );
    expect(screen.getByRole("link", { name: "askNow" })).toHaveAttribute(
      "href",
      "https://claude.ai/new?q=x",
    );
  });

  it("uses the ChatGPT steps for ChatGPT", () => {
    render(<ConnectAiSheet app="chatgpt" onClose={vi.fn()} />);
    expect(screen.getByText("stepOpenChatgpt")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "askNow" }),
    ).not.toBeInTheDocument();
  });
});
