/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it, vi } from "vitest";
import {
  canShareExternalAuthUrl,
  completeDeviceSignIn,
  copyAndOpenExternalAuthUrl,
  shareExternalAuthUrl,
} from "../external-browser";

describe("external browser helpers", () => {
  it("copies the auth URL before opening it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn().mockReturnValue({});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal("open", open);

    await expect(
      copyAndOpenExternalAuthUrl("https://auth.example/request"),
    ).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith("https://auth.example/request");
    expect(open).toHaveBeenCalledWith(
      "https://auth.example/request",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("finishes a device sign-in with a full-page navigation", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign },
    });

    completeDeviceSignIn("/en/recipes");

    expect(assign).toHaveBeenCalledWith("/en/recipes");
  });

  it("shares the auth URL when Web Share is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    expect(canShareExternalAuthUrl()).toBe(true);
    await shareExternalAuthUrl("https://auth.example/request");

    expect(share).toHaveBeenCalledWith({
      title: "RecipAI Google sign-in",
      url: "https://auth.example/request",
    });
  });
});
