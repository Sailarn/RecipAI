/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInSocial = vi.hoisted(() => vi.fn());
const signInPasskey = vi.hoisted(() => vi.fn());
const signInWithTelegramOIDC = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    signIn: { social: signInSocial, passkey: signInPasskey },
    signInWithTelegramOIDC,
    getSession,
  },
}));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
const assign = vi.hoisted(() => vi.fn());
vi.mock("../navigate", () => ({ navigateTo: assign }));

import { ConnectorLogin } from "../connector-login";

const AUTHORIZE_URL =
  "/api/auth/mcp/authorize?client_id=abc&response_type=code&state=xyz";

describe("ConnectorLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Google sign-in to the original authorize request", () => {
    render(<ConnectorLogin authorizeUrl={AUTHORIZE_URL} clientName="Claude" />);
    fireEvent.click(screen.getByRole("button", { name: "continueGoogle" }));

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: AUTHORIZE_URL,
    });
  });

  it("returns Telegram sign-in to the original authorize request", () => {
    render(<ConnectorLogin authorizeUrl={AUTHORIZE_URL} clientName="Claude" />);
    fireEvent.click(screen.getByRole("button", { name: "continueTelegram" }));

    expect(signInWithTelegramOIDC).toHaveBeenCalledWith({
      callbackURL: AUTHORIZE_URL,
    });
  });

  it("continues to the authorize request once a passkey sign-in has a session", async () => {
    signInPasskey.mockResolvedValue({ data: {}, error: null });
    getSession.mockResolvedValue({ data: { user: { id: "u1" } } });

    render(<ConnectorLogin authorizeUrl={AUTHORIZE_URL} clientName="Claude" />);
    fireEvent.click(screen.getByRole("button", { name: "continuePasskey" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(AUTHORIZE_URL));
  });

  it("shows an error when the passkey sign-in leaves no session", async () => {
    signInPasskey.mockRejectedValue(new Error("cancelled"));
    getSession.mockResolvedValue({ data: null });

    render(<ConnectorLogin authorizeUrl={AUTHORIZE_URL} clientName="Claude" />);
    fireEvent.click(screen.getByRole("button", { name: "continuePasskey" }));

    expect(await screen.findByText("signInFailed")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("continues the authorization when the user comes back signed in", async () => {
    getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(<ConnectorLogin authorizeUrl={AUTHORIZE_URL} clientName="Claude" />);

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(assign).toHaveBeenCalledWith(AUTHORIZE_URL));
  });

  it("stays put when the user comes back still signed out", async () => {
    getSession.mockResolvedValue({ data: null });
    render(<ConnectorLogin authorizeUrl={AUTHORIZE_URL} clientName="Claude" />);

    window.dispatchEvent(new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(assign).not.toHaveBeenCalled();
  });
});
