/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: mockTrackEvent }));

import { usePwaInstall } from "../use-pwa-install";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130";

function setEnvironment({
  userAgent = DESKTOP_UA,
  standalone = false,
}: {
  userAgent?: string;
  standalone?: boolean;
}) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: standalone && query === "(display-mode: standalone)",
      }) as MediaQueryList,
  );
}

function installPromptEvent(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePwaInstall", () => {
  describe("platform detection", () => {
    it("reports an installed standalone app and hides the install option", () => {
      setEnvironment({ standalone: true });

      const { result } = renderHook(() => usePwaInstall());

      expect(result.current.isInstalled).toBe(true);
      expect(result.current.showInstallOption).toBe(false);
    });

    it("offers manual install instructions on iOS", () => {
      setEnvironment({ userAgent: IPHONE_UA });

      const { result } = renderHook(() => usePwaInstall());

      expect(result.current.isIOS).toBe(true);
      expect(result.current.showInstallOption).toBe(true);
    });

    it("hides the option on desktop until the browser offers a prompt", () => {
      setEnvironment({});

      const { result } = renderHook(() => usePwaInstall());

      expect(result.current.showInstallOption).toBe(false);
    });
  });

  describe("install prompt", () => {
    it("captures the deferred prompt and marks installed when accepted", async () => {
      setEnvironment({});
      const { result } = renderHook(() => usePwaInstall());
      const event = installPromptEvent("accepted");

      act(() => {
        window.dispatchEvent(event);
      });
      expect(result.current.showInstallOption).toBe(true);

      let installed = false;
      await act(async () => {
        installed = await result.current.install();
      });

      expect(installed).toBe(true);
      expect(event.prompt).toHaveBeenCalledOnce();
      expect(result.current.isInstalled).toBe(true);
    });

    it("drops the prompt but stays uninstalled when dismissed", async () => {
      setEnvironment({});
      const { result } = renderHook(() => usePwaInstall());
      act(() => {
        window.dispatchEvent(installPromptEvent("dismissed"));
      });

      await act(async () => {
        await result.current.install();
      });

      expect(result.current.isInstalled).toBe(false);
      expect(result.current.showInstallOption).toBe(false);
    });

    it("returns false when there is no prompt to show", async () => {
      setEnvironment({});
      const { result } = renderHook(() => usePwaInstall());

      let installed = true;
      await act(async () => {
        installed = await result.current.install();
      });

      expect(installed).toBe(false);
    });
  });

  it("tracks the appinstalled event", () => {
    setEnvironment({});
    renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(mockTrackEvent).toHaveBeenCalledWith("pwa_installed", undefined);
  });
});
