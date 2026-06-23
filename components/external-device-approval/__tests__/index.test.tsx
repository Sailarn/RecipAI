/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSession = vi.hoisted(() => vi.fn());
const signInSocial = vi.hoisted(() => vi.fn());
const verifyDevice = vi.hoisted(() => vi.fn());
const approve = vi.hoisted(() => vi.fn());
const deny = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/external-auth-client", () => ({
  externalAuthClient: {
    useSession,
    signIn: { social: signInSocial },
    device: Object.assign(verifyDevice, { approve, deny }),
    signOut,
  },
}));

import { ExternalDeviceApproval } from "../index";

describe("ExternalDeviceApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL = "https://auth.example";
  });

  it("starts Google authentication when the external browser is signed out", () => {
    useSession.mockReturnValue({ data: null, isPending: false });

    render(<ExternalDeviceApproval userCode="ABCD" locale="uk" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL:
        "https://auth.example/external-auth/device?user_code=ABCD&locale=uk",
    });
  });

  it.each([
    ["Continue to RecipAI", approve],
    ["Deny", deny],
  ] as const)("handles %s and signs out the temporary browser session", async (label, action) => {
    useSession.mockReturnValue({
      data: { user: { email: "person@example.com", name: "Person" } },
      isPending: false,
    });
    verifyDevice.mockResolvedValue({ data: {}, error: null });
    action.mockResolvedValue({ data: {}, error: null });
    signOut.mockResolvedValue({ data: {}, error: null });

    render(<ExternalDeviceApproval userCode="ABCD" locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: label }));

    await waitFor(() =>
      expect(action).toHaveBeenCalledWith({ userCode: "ABCD" }),
    );
    expect(verifyDevice).toHaveBeenCalledWith({
      query: { user_code: "ABCD" },
    });
    expect(signOut).toHaveBeenCalledOnce();
    expect(screen.getByText("Done. Return to RecipAI.")).toBeVisible();
  });

  it("shows a stable error for an expired code", async () => {
    useSession.mockReturnValue({
      data: { user: { email: "person@example.com", name: "Person" } },
      isPending: false,
    });
    verifyDevice.mockResolvedValue({
      data: null,
      error: { message: "expired" },
    });

    render(<ExternalDeviceApproval userCode="ABCD" locale="en" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to RecipAI" }),
    );

    expect(
      await screen.findByText("This request is invalid or expired."),
    ).toBeVisible();
    expect(approve).not.toHaveBeenCalled();
  });
});
