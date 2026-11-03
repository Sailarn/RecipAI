/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/auth-client", () => ({ authClient: { signOut } }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
const assign = vi.hoisted(() => vi.fn());
vi.mock("../navigate", () => ({ navigateTo: assign }));

import { ConnectorConsent, safeRedirectTarget } from "../connector-consent";

describe("safeRedirectTarget", () => {
  it("accepts absolute http(s) callback URLs", () => {
    expect(
      safeRedirectTarget("https://claude.ai/api/mcp/auth_callback?code=1"),
    ).toBe("https://claude.ai/api/mcp/auth_callback?code=1");
  });

  it("rejects script schemes, relative paths and non-strings", () => {
    expect(safeRedirectTarget("javascript:alert(1)")).toBeNull();
    expect(safeRedirectTarget("data:text/html,hi")).toBeNull();
    expect(safeRedirectTarget("/relative")).toBeNull();
    expect(safeRedirectTarget(undefined)).toBeNull();
  });
});

describe("ConnectorConsent", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["allow", true],
    ["deny", false],
  ] as const)(
    "posts the %s decision and follows the callback",
    async (label, accept) => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ redirectURI: "https://claude.ai/cb?code=abc" }),
          { status: 200 },
        ),
      );

      render(
        <ConnectorConsent consentCode="C1" clientName="Claude" account="Ann" />,
      );
      fireEvent.click(screen.getByRole("button", { name: label }));

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith("https://claude.ai/cb?code=abc"),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/oauth2/consent",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ accept, consent_code: "C1" }),
        }),
      );
    },
  );

  it("shows a failure when the consent request is rejected", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    render(
      <ConnectorConsent consentCode="C1" clientName="Claude" account="Ann" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "allow" }));

    expect(await screen.findByText("consentFailedTitle")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("signs out when the account is not the user's", async () => {
    signOut.mockResolvedValue({});
    render(
      <ConnectorConsent consentCode="C1" clientName="Claude" account="Ann" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "notYou" }));

    expect(await screen.findByText("signedOutTitle")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });
});
