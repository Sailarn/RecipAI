/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSession = vi.hoisted(() => vi.fn());
const useAiConnections = vi.hoisted(() => vi.fn());
const disconnect = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/auth/auth-client", () => ({ authClient: { useSession } }));
vi.mock("@/lib/hooks/use-ai-connections", () => ({ useAiConnections }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/components/ask-ai/connect-sheet", () => ({
  ConnectAiSheet: ({ app }: { app: string }) => (
    <div role="dialog" aria-label={`setup ${app}`} />
  ),
}));

import { AiAssistants } from "../index";

const claudeConnection = { clientId: "c1", app: "claude" };

function state(connected: boolean) {
  useAiConnections.mockReturnValue({
    status: "ready",
    connections: connected
      ? [claudeConnection, { clientId: "x", app: null }]
      : [],
    connectedApps: new Set(connected ? ["claude"] : []),
    disconnect,
  });
}

describe("AiAssistants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: { user: { id: "u1" } } });
  });

  it("renders nothing when signed out", () => {
    useSession.mockReturnValue({ data: null });
    state(false);
    const { container } = render(<AiAssistants />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers setup for an app that isn't connected", () => {
    state(false);
    render(<AiAssistants />);
    fireEvent.click(screen.getByRole("button", { name: "connect" }));
    expect(
      screen.getByRole("dialog", { name: "setup claude" }),
    ).toBeInTheDocument();
  });

  it("disconnects every client of that app", async () => {
    state(true);
    disconnect.mockResolvedValue(undefined);
    render(<AiAssistants />);

    expect(screen.getByText("connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "disconnect" }));

    await waitFor(() => expect(disconnect).toHaveBeenCalledWith(["c1"]));
    expect(toast.success).toHaveBeenCalledWith("disconnected");
  });

  it("reports a failed disconnect", async () => {
    state(true);
    disconnect.mockRejectedValue(new Error("500"));
    render(<AiAssistants />);
    fireEvent.click(screen.getByRole("button", { name: "disconnect" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
