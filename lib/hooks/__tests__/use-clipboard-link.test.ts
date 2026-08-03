import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClipboardLink } from "../use-clipboard-link";

const getTelegramWebApp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/telegram/webapp", () => ({ getTelegramWebApp }));

interface ClipboardEnvOptions {
  text?: string;
  readTextThrows?: boolean;
  supported?: boolean;
  permission?: PermissionState | "unsupported";
}

function setupClipboard(options: ClipboardEnvOptions = {}) {
  const {
    text = "",
    readTextThrows = false,
    supported = true,
    permission = "prompt",
  } = options;

  const readText = readTextThrows
    ? vi.fn().mockRejectedValue(new Error("not allowed"))
    : vi.fn().mockResolvedValue(text);

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: supported ? { readText } : undefined,
  });

  const query =
    permission === "unsupported"
      ? vi.fn().mockRejectedValue(new TypeError("unknown permission"))
      : vi.fn().mockResolvedValue({ state: permission });

  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query },
  });

  return { readText, query };
}

beforeEach(() => {
  getTelegramWebApp.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useClipboardLink", () => {
  describe("paste availability", () => {
    it("offers pasting when the clipboard API is present", () => {
      setupClipboard();

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      expect(result.current.canPaste).toBe(true);
    });

    it("does not offer pasting without clipboard support outside Telegram", () => {
      setupClipboard({ supported: false });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      expect(result.current.canPaste).toBe(false);
    });

    it("offers pasting inside Telegram even without the browser API", () => {
      setupClipboard({ supported: false });
      getTelegramWebApp.mockReturnValue({ readTextFromClipboard: vi.fn() });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      expect(result.current.canPaste).toBe(true);
    });
  });

  describe("pasteLink", () => {
    it("returns the link held in the clipboard", async () => {
      setupClipboard({ text: "https://silpo.ua/recipes/borscht" });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await expect(result.current.pasteLink()).resolves.toBe(
        "https://silpo.ua/recipes/borscht",
      );
    });

    it("extracts the link out of surrounding shared text", async () => {
      setupClipboard({ text: "Borscht\n\nhttps://silpo.ua/recipes/borscht" });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await expect(result.current.pasteLink()).resolves.toBe(
        "https://silpo.ua/recipes/borscht",
      );
    });

    it("returns null when the clipboard holds no link", async () => {
      setupClipboard({ text: "just some notes" });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await expect(result.current.pasteLink()).resolves.toBeNull();
    });

    it("returns null instead of throwing when the read is denied", async () => {
      setupClipboard({ readTextThrows: true });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await expect(result.current.pasteLink()).resolves.toBeNull();
    });

    it("prefers the Telegram clipboard when it yields text", async () => {
      const { readText } = setupClipboard({ text: "https://browser.example" });
      getTelegramWebApp.mockReturnValue({
        readTextFromClipboard: (callback: (value: string) => void) =>
          callback("https://telegram.example/recipe"),
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await expect(result.current.pasteLink()).resolves.toBe(
        "https://telegram.example/recipe",
      );
      expect(readText).not.toHaveBeenCalled();
    });

    it("falls back to the browser when Telegram returns empty text", async () => {
      setupClipboard({ text: "https://browser.example/recipe" });
      getTelegramWebApp.mockReturnValue({
        readTextFromClipboard: (callback: (value: string) => void) =>
          callback(""),
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await expect(result.current.pasteLink()).resolves.toBe(
        "https://browser.example/recipe",
      );
    });
  });

  describe("silent suggestion", () => {
    it("suggests a copied link when clipboard-read is already granted", async () => {
      setupClipboard({
        text: "https://silpo.ua/recipes/borscht",
        permission: "granted",
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await waitFor(() =>
        expect(result.current.suggestion).toBe(
          "https://silpo.ua/recipes/borscht",
        ),
      );
    });

    it("stays silent when the permission has not been granted", async () => {
      const { readText } = setupClipboard({
        text: "https://silpo.ua/recipes/borscht",
        permission: "prompt",
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await waitFor(() => expect(readText).not.toHaveBeenCalled());
      expect(result.current.suggestion).toBeNull();
    });

    it("stays silent where the permission name is unknown", async () => {
      const { readText } = setupClipboard({
        text: "https://silpo.ua/recipes/borscht",
        permission: "unsupported",
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));

      await waitFor(() => expect(readText).not.toHaveBeenCalled());
      expect(result.current.suggestion).toBeNull();
    });

    it("stays silent while disabled", async () => {
      const { query } = setupClipboard({
        text: "https://silpo.ua/recipes/borscht",
        permission: "granted",
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: false }));

      await waitFor(() => expect(query).not.toHaveBeenCalled());
      expect(result.current.suggestion).toBeNull();
    });

    it("does not re-suggest a link the user dismissed", async () => {
      setupClipboard({
        text: "https://silpo.ua/recipes/borscht",
        permission: "granted",
      });

      const { result } = renderHook(() => useClipboardLink({ enabled: true }));
      await waitFor(() => expect(result.current.suggestion).not.toBeNull());

      act(() => result.current.dismissSuggestion());
      expect(result.current.suggestion).toBeNull();

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await waitFor(() => expect(result.current.suggestion).toBeNull());
    });
  });
});
