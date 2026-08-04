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
        title="waitingForGoogle"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("waitingForGoogle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "openInBrowser" })).toBeVisible();
    expect(screen.getByRole("button", { name: "copyLink" })).toBeVisible();
    expect(screen.getByRole("button", { name: "cancel" })).toBeVisible();
  });

  it("copies before attempting to open the supplied URL", async () => {
    copyAndOpenExternalAuthUrl.mockResolvedValue(true);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="waitingForGoogle"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "openInBrowser" }));

    await waitFor(() => {
      expect(copyAndOpenExternalAuthUrl).toHaveBeenCalledWith(
        "https://auth.example/request",
      );
      expect(
        screen.getByRole("button", { name: "openingBrowser" }),
      ).toBeVisible();
    });
  });

  it("copies the supplied URL without opening it", async () => {
    copyExternalAuthUrl.mockResolvedValue(undefined);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="waitingForGoogle"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "copyLink" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "linkCopiedOpen" }),
      ).toBeVisible();
    });
  });

  it("makes Share the primary action on an iOS PWA", async () => {
    isIos.mockReturnValue(true);
    canShareExternalAuthUrl.mockReturnValue(true);
    shareExternalAuthUrl.mockResolvedValue(undefined);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="waitingForGoogle"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("shareFirstHint")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "openInBrowser" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "shareLink" }));

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
        title="waitingForGoogle"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "openInBrowser" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "shareLink" }),
    ).not.toBeInTheDocument();
  });

  it("reports clipboard failure and allows cancellation", async () => {
    const onCancel = vi.fn();
    copyExternalAuthUrl.mockRejectedValue(new Error("Clipboard unavailable"));
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="waitingForGoogle"
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "copyLink" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(await screen.findByText("copyFailed")).toBeVisible();
  });
});
