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
import { ThemeToggle } from "../index";

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
    it("shows 'Switch to dark mode' when light mode is active", () => {
      render(<ThemeToggle />);
      expect(
        screen.getByRole("button", { name: "Switch to dark mode" }),
      ).toBeInTheDocument();
    });

    it("shows 'Switch to light mode' when dark mode is active", () => {
      document.documentElement.classList.add("dark");
      render(<ThemeToggle />);
      expect(
        screen.getByRole("button", { name: "Switch to light mode" }),
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
