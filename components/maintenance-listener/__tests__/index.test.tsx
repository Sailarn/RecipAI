import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaintenanceListener } from "@/components/maintenance-listener";
import { MAINTENANCE_EVENT } from "@/lib/api/api-fetch";

const { error } = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("sonner", () => ({ toast: { error } }));

function dispatchMaintenance(message?: string) {
  window.dispatchEvent(
    new CustomEvent(MAINTENANCE_EVENT, { detail: { message } }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MaintenanceListener", () => {
  it("shows the maintenance message as a deduped toast", () => {
    render(<MaintenanceListener />);

    dispatchMaintenance("Down for maintenance");

    expect(error).toHaveBeenCalledWith("Down for maintenance", {
      id: "maintenance-mode",
      duration: 8000,
    });
  });

  it("ignores events without a message", () => {
    render(<MaintenanceListener />);

    dispatchMaintenance(undefined);

    expect(error).not.toHaveBeenCalled();
  });

  it("stops listening after unmount", () => {
    const { unmount } = render(<MaintenanceListener />);

    unmount();
    dispatchMaintenance("After unmount");

    expect(error).not.toHaveBeenCalled();
  });
});
