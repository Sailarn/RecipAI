import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  announceIfMaintenance,
  apiFetch,
  MAINTENANCE_EVENT,
  MaintenanceError,
  maintenanceErrorFromResponse,
} from "@/lib/api/api-fetch";

function maintenanceResponse(message: string | null = "Down for upgrades") {
  return new Response(
    JSON.stringify({ error: message, code: "MAINTENANCE_MODE" }),
    {
      status: 503,
    },
  );
}

describe("maintenanceErrorFromResponse", () => {
  it("returns the server message for a maintenance 503", async () => {
    const error = await maintenanceErrorFromResponse(
      maintenanceResponse("Back at noon"),
    );

    expect(error).toBeInstanceOf(MaintenanceError);
    expect(error?.message).toBe("Back at noon");
  });

  it("falls back to the default message when the body omits one", async () => {
    const error = await maintenanceErrorFromResponse(maintenanceResponse(null));

    expect(error?.message).toBe("Service maintenance in progress");
  });

  it("returns null for a 503 without the maintenance code", async () => {
    const response = new Response(JSON.stringify({ error: "busy" }), {
      status: 503,
    });

    expect(await maintenanceErrorFromResponse(response)).toBeNull();
  });

  it("returns null for a non-503 response", async () => {
    expect(
      await maintenanceErrorFromResponse(new Response("{}", { status: 200 })),
    ).toBeNull();
  });

  it("returns null when the body is not JSON", async () => {
    expect(
      await maintenanceErrorFromResponse(
        new Response("<html>", { status: 503 }),
      ),
    ).toBeNull();
  });

  it("does not consume the original response body", async () => {
    const response = maintenanceResponse("hi");

    await maintenanceErrorFromResponse(response);

    expect(response.bodyUsed).toBe(false);
  });
});

describe("announceIfMaintenance", () => {
  let received: string | undefined;

  function capture(event: Event) {
    received = (event as CustomEvent<{ message: string }>).detail.message;
  }

  beforeEach(() => {
    received = undefined;
    window.addEventListener(MAINTENANCE_EVENT, capture);
  });

  afterEach(() => {
    window.removeEventListener(MAINTENANCE_EVENT, capture);
  });

  it("dispatches the message and reports true for maintenance", async () => {
    const handled = await announceIfMaintenance(maintenanceResponse("Soon"));

    expect(handled).toBe(true);
    expect(received).toBe("Soon");
  });

  it("reports false and stays quiet for other responses", async () => {
    const handled = await announceIfMaintenance(
      new Response("{}", { status: 500 }),
    );

    expect(handled).toBe(false);
    expect(received).toBeUndefined();
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the response when the request succeeds", async () => {
    const ok = new Response("{}", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok));

    expect(await apiFetch("/api/recipes")).toBe(ok);
  });

  it("returns the response for a non-maintenance error", async () => {
    const serverError = new Response("{}", { status: 500 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(serverError));

    expect(await apiFetch("/api/recipes")).toBe(serverError);
  });

  it("throws MaintenanceError and announces during maintenance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(maintenanceResponse("Nope")),
    );
    const handler = vi.fn();
    window.addEventListener(MAINTENANCE_EVENT, handler);

    await expect(apiFetch("/api/recipes")).rejects.toThrow("Nope");
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener(MAINTENANCE_EVENT, handler);
  });
});
