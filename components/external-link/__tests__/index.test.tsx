/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redeem = vi.hoisted(() => vi.fn());
const cleanup = vi.hoisted(() => vi.fn());
const linkSocial = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/external-auth-client", () => ({
  externalAuthClient: {
    externalLink: { redeem, cleanup },
    linkSocial,
  },
}));

import { ExternalLink, ExternalLinkComplete } from "../index";

describe("ExternalLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL = "https://auth.example";
    history.replaceState(null, "", "/external-auth/link");
  });

  it("removes the fragment, redeems it once, and starts Google linking", async () => {
    redeem.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    linkSocial.mockResolvedValue({ data: {}, error: null });
    history.replaceState(null, "", "/external-auth/link#token=one-time-token");

    render(<ExternalLink locale="en" />);

    await waitFor(() => expect(redeem).toHaveBeenCalledOnce());
    expect(window.location.hash).toBe("");
    expect(redeem).toHaveBeenCalledWith({ token: "one-time-token" });
    expect(linkSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "https://auth.example/external-auth/link/complete?locale=en",
      errorCallbackURL:
        "https://auth.example/external-auth/link/complete?locale=en&error=link_failed",
    });
  });

  it("rejects a missing or expired handoff", async () => {
    redeem.mockResolvedValue({ data: null, error: { message: "expired" } });
    history.replaceState(null, "", "/external-auth/link#token=expired");

    render(<ExternalLink locale="en" />);

    expect(
      await screen.findByText("This linking request is invalid or expired."),
    ).toBeVisible();
    expect(linkSocial).not.toHaveBeenCalled();
  });

  it("does not redeem a request without a token", async () => {
    render(<ExternalLink locale="en" />);

    expect(screen.getByText("This linking request is invalid.")).toBeVisible();
    expect(redeem).not.toHaveBeenCalled();
  });
});

describe("ExternalLinkComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    history.replaceState(null, "", "/external-auth/link/complete");
  });

  it("deletes the temporary session before reporting success", async () => {
    cleanup.mockResolvedValue({ data: { success: true }, error: null });

    render(<ExternalLinkComplete />);

    expect(
      await screen.findByText("Google account linked. Return to RecipAI."),
    ).toBeVisible();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("reports the provider callback error after cleanup", async () => {
    cleanup.mockResolvedValue({ data: { success: true }, error: null });
    history.replaceState(
      null,
      "",
      "/external-auth/link/complete?error=link_failed",
    );

    render(<ExternalLinkComplete />);

    expect(
      await screen.findByText(/it may already be a separate RecipAI account/),
    ).toBeVisible();
  });
});
