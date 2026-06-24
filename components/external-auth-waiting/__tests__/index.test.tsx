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
const isIos = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/auth/external-browser", () => ({
  openExternalAuth,
  copyExternalAuthUrl,
  copyAndOpenExternalAuthUrl,
  canShareExternalAuthUrl,
  shareExternalAuthUrl,
}));

vi.mock("@/lib/pwa", () => ({ isIos }));

import { ExternalAuthWaiting } from "../index";

describe("ExternalAuthWaiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canShareExternalAuthUrl.mockReturnValue(false);
    isIos.mockReturnValue(false);
  });

  it("offers browser, clipboard, and cancel actions on non-iOS", () => {
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Waiting for Google")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open in browser" }),
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

    fireEvent.click(screen.getByRole("button", { name: "Open in browser" }));

    await waitFor(() => {
      expect(copyAndOpenExternalAuthUrl).toHaveBeenCalledWith(
        "https://auth.example/request",
      );
      expect(
        screen.getByRole("button", { name: /Opening browser/ }),
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

  it("makes Share the primary action on an iOS PWA", async () => {
    isIos.mockReturnValue(true);
    canShareExternalAuthUrl.mockReturnValue(true);
    shareExternalAuthUrl.mockResolvedValue(undefined);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/Tap Share/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Open in browser" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share link" }));

    await waitFor(() => {
      expect(shareExternalAuthUrl).toHaveBeenCalledWith(
        "https://auth.example/request",
      );
    });
  });

  it("falls back to copy-and-open when iOS cannot share", () => {
    isIos.mockReturnValue(true);
    canShareExternalAuthUrl.mockReturnValue(false);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Open in browser" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Share link" }),
    ).not.toBeInTheDocument();
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
