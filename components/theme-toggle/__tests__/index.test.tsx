/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { setCloudItem } from "@/lib/telegram/cloud-storage";
import { ThemeToggle } from "../index";

vi.mock("@/lib/telegram/cloud-storage", () => ({
  CLOUD_PREF_KEYS: { theme: "theme", locale: "locale" },
  setCloudItem: vi.fn().mockResolvedValue(true),
}));

const reloadSpy = vi.fn();
const replaceSpy = vi.fn();

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload: reloadSpy, replace: replaceSpy },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  vi.spyOn(Storage.prototype, "setItem");
});

beforeEach(() => {
  reloadSpy.mockClear();
  replaceSpy.mockClear();
  vi.mocked(Storage.prototype.setItem).mockClear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  describe("aria-label reflects active theme", () => {
    it("offers dark mode while light mode is active", () => {
      render(<ThemeToggle />);
      expect(
        screen.getByRole("button", { name: "switchToDark" }),
      ).toBeInTheDocument();
    });

    it("offers light mode while dark mode is active", () => {
      document.documentElement.classList.add("dark");
      render(<ThemeToggle />);
      expect(
        screen.getByRole("button", { name: "switchToLight" }),
      ).toBeInTheDocument();
    });
  });

  describe("on toggle", () => {
    it("saves 'dark' to localStorage when switching from light to dark", () => {
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button"));

      expect(Storage.prototype.setItem).toHaveBeenCalledWith("theme", "dark");
    });

    it("saves 'light' to localStorage when switching from dark to light", () => {
      document.documentElement.classList.add("dark");
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button"));

      expect(Storage.prototype.setItem).toHaveBeenCalledWith("theme", "light");
    });

    it("mirrors the theme to Telegram CloudStorage for cross-reopen persistence", () => {
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button"));

      expect(setCloudItem).toHaveBeenCalledWith("theme", "dark");
    });

    it("sets the theme cookie when toggling", () => {
      const cookieSpy = vi.spyOn(document, "cookie", "set");
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button"));

      expect(cookieSpy).toHaveBeenCalledWith(
        expect.stringContaining("theme=dark"),
      );
    });

    it("reloads the page after toggling in web mode", () => {
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button"));

      expect(reloadSpy).toHaveBeenCalledOnce();
    });

    it("navigates to splash page after toggling in PWA mode", () => {
      vi.mocked(window.matchMedia).mockReturnValueOnce({
        matches: true,
      } as MediaQueryList);
      render(<ThemeToggle />);

      fireEvent.click(screen.getByRole("button"));

      expect(replaceSpy).toHaveBeenCalledOnce();
      expect(replaceSpy).toHaveBeenCalledWith(
        expect.stringContaining("/pwa-launch.html?from="),
      );
    });
  });
});
