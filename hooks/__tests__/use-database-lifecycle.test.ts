/**
 * @vitest-environment happy-dom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDatabaseLifecycle } from "../use-database-lifecycle";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

const { captureError } = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ captureError }));

const handlers = new Map<string, (() => void)[]>();
const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    close: vi.fn(),
    open: vi.fn(),
    on: vi.fn(),
  },
}));
vi.mock("@/lib/db/db", () => ({ db: dbMock }));

import { toast } from "sonner";

/** Dexie's `db.on(name, handler)` / `db.on(name).unsubscribe(handler)` shape. */
function fireEvent(name: string) {
  for (const handler of handlers.get(name) ?? []) handler();
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
  dbMock.open.mockResolvedValue(undefined);
  dbMock.on.mockImplementation((name: string, handler?: () => void) => {
    if (handler) {
      handlers.set(name, [...(handlers.get(name) ?? []), handler]);
      return undefined;
    }
    return {
      unsubscribe: (target: () => void) =>
        handlers.set(
          name,
          (handlers.get(name) ?? []).filter((entry) => entry !== target),
        ),
    };
  });
});

describe("useDatabaseLifecycle", () => {
  it("explains an unopenable database instead of leaving skeletons forever", async () => {
    dbMock.open.mockRejectedValue(new Error("storage blocked"));

    renderHook(() => useDatabaseLifecycle());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "storageUnavailable",
        expect.anything(),
      ),
    );
  });

  it("reports an unopenable database", async () => {
    const failure = new Error("storage blocked");
    dbMock.open.mockRejectedValue(failure);

    renderHook(() => useDatabaseLifecycle());

    await waitFor(() =>
      expect(captureError).toHaveBeenCalledWith(failure, {
        tags: { source: "dexie-open" },
      }),
    );
  });

  it("closes the connection and offers a reload when another tab upgrades", () => {
    renderHook(() => useDatabaseLifecycle());

    fireEvent("versionchange");

    expect(dbMock.close).toHaveBeenCalledOnce();
    expect(toast.warning).toHaveBeenCalledWith(
      "storageUpgraded",
      expect.objectContaining({
        action: expect.objectContaining({ label: "reload" }),
      }),
    );
  });

  it("asks the user to close other tabs when an upgrade is blocked", () => {
    renderHook(() => useDatabaseLifecycle());

    fireEvent("blocked");

    expect(toast.warning).toHaveBeenCalledWith("storageBlocked");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useDatabaseLifecycle());

    unmount();
    fireEvent("versionchange");

    expect(dbMock.close).not.toHaveBeenCalled();
  });
});
