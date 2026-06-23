/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openExternalAuth = vi.hoisted(() => vi.fn());
const copyExternalAuthUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/external-auth-flow", () => ({
  openExternalAuth,
  copyExternalAuthUrl,
}));

import { ExternalAuthWaiting } from "../index";

describe("ExternalAuthWaiting", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers browser, clipboard, and cancel actions", () => {
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Waiting for Google")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open browser" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  it("opens and copies the supplied URL", async () => {
    copyExternalAuthUrl.mockResolvedValue(undefined);
    render(
      <ExternalAuthWaiting
        url="https://auth.example/request"
        title="Waiting for Google"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open browser" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(openExternalAuth).toHaveBeenCalledWith(
      "https://auth.example/request",
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Link copied" })).toBeVisible();
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
