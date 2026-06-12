// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { captureServerEvent, captureClientEvent, sendLog } = vi.hoisted(() => ({
  captureServerEvent: vi.fn(),
  captureClientEvent: vi.fn(),
  sendLog: vi.fn(),
}));

vi.mock("../posthog-server", () => ({ captureServerEvent }));
vi.mock("../posthog-client", () => ({
  captureClientEvent,
  identifyClient: vi.fn(),
  resetClient: vi.fn(),
  initPostHogClient: vi.fn(),
}));
vi.mock("../axiom", () => ({ sendLog }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.unmock("@/lib/telemetry");

import { log, trackEvent } from "@/lib/telemetry";

function flushDynamicImports() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("telemetry facade on the server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes trackEvent to the server capturer", async () => {
    trackEvent("rate_limit_hit", { caller_type: "anon" });
    await flushDynamicImports();

    expect(captureServerEvent).toHaveBeenCalledWith("rate_limit_hit", {
      caller_type: "anon",
    });
    expect(captureClientEvent).not.toHaveBeenCalled();
  });

  it("ships log fields to Axiom", async () => {
    log("warn", "ai_call", { model: "gemini-2.5-flash" });
    await flushDynamicImports();

    expect(sendLog).toHaveBeenCalledWith("warn", "ai_call", {
      model: "gemini-2.5-flash",
    });
  });
});
