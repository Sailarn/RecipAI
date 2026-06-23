/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openExternalAuth = vi.hoisted(() => vi.fn());
const copyExternalAuthUrl = vi.hoisted(() => vi.fn());
const copyAndOpenExternalAuthUrl = vi.hoisted(() => vi.fn());
const canShareExternalAuthUrl = vi.hoisted(() => vi.fn(() => false));
const shareExternalAuthUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/external-auth-flow", () => ({
  openExternalAuth,
  copyExternalAuthUrl,
  copyAndOpenExternalAuthUrl,
  canShareExternalAuthUrl,
  shareExternalAuthUrl,
}));

import { ExternalAuthWaiting } from "../index";

describe("ExternalAuthWaiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canShareExternalAuthUrl.mockReturnValue(false);
  });

  it("offers browser, clipboard, and cancel actions", () => {
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Waiting for Google")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy and open browser" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("copies before attempting to open the supplied URL", async () => {
    copyAndOpenExternalAuthUrl.mockResolvedValue(true);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy and open browser" }),
    );

    await waitFor(() => {
      expect(copyAndOpenExternalAuthUrl).toHaveBeenCalledWith(
        "https://auth.example/request",
      );
      expect(
        screen.getByRole("button", { name: /Copied — opening/ }),
      ).toBeVisible();
    });
  });

  it("copies the supplied URL without opening it", async () => {
    copyExternalAuthUrl.mockResolvedValue(undefined);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Link copied/ })).toBeVisible();
    });
  });

  it("shows a share fallback when supported", async () => {
    canShareExternalAuthUrl.mockReturnValue(true);
    shareExternalAuthUrl.mockResolvedValue(undefined);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Share link" }));

    await waitFor(() => {
      expect(shareExternalAuthUrl).toHaveBeenCalledWith(
        "https://auth.example/request",
      );
    });
  });

  it("reports clipboard failure and allows cancellation", async () => {
    const onCancel = vi.fn();
    copyExternalAuthUrl.mockRejectedValue(new Error("Clipboard unavailable"));
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(await screen.findByText("Could not copy the link.")).toBeVisible();
  });
});
