import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";

// Mock matchMedia — happy-dom simulates a desktop (pointer: fine = true), which causes
// useLongPress to skip its timer entirely. Default to non-fine pointer so timer-based
// long-press tests work. Individual tests can override via vi.spyOn / Object.assign.
// Guard: node-environment tests (e.g. server-branch telemetry) have no window.
if (typeof window !== "undefined")
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

// Components read copy through next-intl, which needs a provider that unit
// tests don't render. Returning the key keeps assertions on stable identifiers
// instead of English copy that changes whenever wording does. A test that cares
// about real translations can still override this with a local vi.mock.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("@/lib/transitions", () => ({
  slideTransition: vi.fn(),
  useNavigate: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: vi.fn(),
  identifyUser: vi.fn(),
  resetIdentity: vi.fn(),
  captureError: vi.fn(),
  log: vi.fn(),
}));

afterEach(() => {
  cleanup();
});
