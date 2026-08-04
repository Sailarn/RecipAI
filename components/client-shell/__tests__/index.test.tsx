import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: vi.fn(() => () => null),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/en/recipes"),
}));

vi.mock("sonner", () => ({
  Toaster: vi.fn(() => null),
}));

vi.mock("@/components/page-stack", () => ({
  PageStack: vi.fn(() => null),
}));

vi.mock("@/components/telegram-back-button", () => ({
  TelegramBackButton: vi.fn(() => null),
}));

vi.mock("@/components/telegram-deep-link", () => ({
  TelegramDeepLink: vi.fn(() => null),
}));

vi.mock("@/components/telegram-button-haptics", () => ({
  TelegramButtonHaptics: vi.fn(() => null),
}));

vi.mock("@/hooks/use-database-lifecycle", () => ({
  useDatabaseLifecycle: vi.fn(),
}));

vi.mock("@/lib/hooks/use-normalize-on-startup", () => ({
  useNormalizeOnStartup: vi.fn(),
}));

vi.mock("@/lib/hooks/use-telemetry-identity", () => ({
  useTelemetryIdentity: vi.fn(),
}));

vi.mock("@/lib/hooks/use-vocab-sync", () => ({
  useVocabSync: vi.fn(),
}));

vi.mock("@/hooks/use-sync-on-login", () => ({
  useSyncOnLogin: () => ({ triggerSync: vi.fn() }),
}));

vi.mock("@/lib/navigation-stack", () => ({
  NavigationStackProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

import { Toaster } from "sonner";
import { ClientShell } from "../index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ClientShell notifications", () => {
  it("keeps toasts below the safe area", () => {
    render(<ClientShell>content</ClientShell>);

    expect(Toaster).toHaveBeenCalledWith(
      expect.objectContaining({
        mobileOffset: { top: "var(--mobile-toast-offset)" },
      }),
      undefined,
    );
  });

  it("allows upward and horizontal dismissal gestures", () => {
    render(<ClientShell>content</ClientShell>);

    expect(Toaster).toHaveBeenCalledWith(
      expect.objectContaining({
        swipeDirections: ["top", "left", "right"],
      }),
      undefined,
    );
  });
});
