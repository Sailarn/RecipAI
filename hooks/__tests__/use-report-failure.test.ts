/**
 * @vitest-environment happy-dom
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReportFailure } from "../use-report-failure";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import { toast } from "sonner";

describe("useReportFailure", () => {
  it("tells the user the action failed", () => {
    const { result } = renderHook(() => useReportFailure());

    expect(() => result.current(new Error("boom"))).toThrow();
    expect(toast.error).toHaveBeenCalledWith("error");
  });

  it("re-throws the original error so Sentry still sees it", () => {
    const original = new Error("dexie write failed");
    const { result } = renderHook(() => useReportFailure());

    expect(() => result.current(original)).toThrow(original);
  });
});
