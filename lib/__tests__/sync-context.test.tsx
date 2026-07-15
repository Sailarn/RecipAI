import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockTriggerSync = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-sync-on-login", () => ({
  useSyncOnLogin: () => ({ triggerSync: mockTriggerSync }),
}));

import { SyncProvider, useTriggerSync } from "../sync-context";

function Consumer() {
  const triggerSync = useTriggerSync();
  return (
    <button type="button" onClick={() => triggerSync()}>
      refresh
    </button>
  );
}

describe("useTriggerSync", () => {
  it("throws when called outside SyncProvider", () => {
    expect(() => renderHook(() => useTriggerSync())).toThrow(
      "useTriggerSync outside SyncProvider",
    );
  });

  it("exposes useSyncOnLogin's triggerSync to descendants via context", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>,
    );

    screen.getByRole("button").click();

    expect(mockTriggerSync).toHaveBeenCalledTimes(1);
  });
});
