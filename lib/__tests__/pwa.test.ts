/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { isIos, isStandalonePwa } from "../pwa";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockMatchMedia(standalone: boolean) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: standalone && query === "(display-mode: standalone)",
      }) as MediaQueryList,
  );
}

describe("isStandalonePwa", () => {
  it("is true in standalone display mode", () => {
    mockMatchMedia(true);

    expect(isStandalonePwa()).toBe(true);
  });

  it("is true for iOS's legacy navigator.standalone", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    });

    expect(isStandalonePwa()).toBe(true);

    Reflect.deleteProperty(navigator, "standalone");
  });

  it("is false in a browser tab", () => {
    mockMatchMedia(false);

    expect(isStandalonePwa()).toBe(false);
  });
});

describe("isIos", () => {
  function setDevice(userAgent: string, platform: string, touchPoints: number) {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
    vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(touchPoints);
  }

  it("detects an iPhone", () => {
    setDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", "iPhone", 5);

    expect(isIos()).toBe(true);
  });

  it("detects an iPad that reports as a Mac", () => {
    setDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5);

    expect(isIos()).toBe(true);
  });

  it("is false on a desktop Mac", () => {
    setDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 0);

    expect(isIos()).toBe(false);
  });
});
