import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth/auth-client";
import { identifyUser, resetIdentity } from "@/lib/telemetry";
import { useTelemetryIdentity } from "../use-telemetry-identity";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: { useSession: vi.fn() },
}));

type SessionResult = ReturnType<typeof authClient.useSession>;

function mockSession(value: { data: unknown; isPending: boolean }): void {
  vi.mocked(authClient.useSession).mockReturnValue(
    value as unknown as SessionResult,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function atPath(pathname: string): void {
  vi.stubGlobal("location", { pathname });
}

describe("useTelemetryIdentity", () => {
  it("identifies the user when a session is present", () => {
    atPath("/ua/recipes");
    mockSession({ data: { user: { id: "user-1" } }, isPending: false });

    renderHook(() => useTelemetryIdentity());

    expect(identifyUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ locale: "ua" }),
    );
    expect(resetIdentity).not.toHaveBeenCalled();
  });

  it("omits the locale outside the locale-prefixed app", () => {
    // This hook also runs under /external-auth, where the first path segment
    // is not a locale. Writing it anyway would overwrite a real locale with
    // "external-auth".
    atPath("/external-auth/device");
    mockSession({ data: { user: { id: "user-1" } }, isPending: false });

    renderHook(() => useTelemetryIdentity());

    expect(identifyUser).toHaveBeenCalledWith(
      "user-1",
      expect.not.objectContaining({ locale: expect.anything() }),
    );
  });

  it("includes email, name, and image when the provider supplies them", () => {
    mockSession({
      data: {
        user: {
          id: "user-1",
          email: "cook@example.com",
          name: "Cook",
          image: "https://example.com/avatar.png",
        },
      },
      isPending: false,
    });

    renderHook(() => useTelemetryIdentity());

    expect(identifyUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        email: "cook@example.com",
        name: "Cook",
        image: "https://example.com/avatar.png",
      }),
    );
  });

  it("omits properties a provider leaves empty (passkey/telegram without email)", () => {
    mockSession({
      data: { user: { id: "user-2", email: "", name: "Cook", image: null } },
      isPending: false,
    });

    renderHook(() => useTelemetryIdentity());

    const [distinctId, properties] = vi.mocked(identifyUser).mock.calls[0];
    expect(distinctId).toBe("user-2");
    expect(properties).not.toHaveProperty("email");
    expect(properties).not.toHaveProperty("image");
    expect(properties).toHaveProperty("name", "Cook");
  });

  it("does nothing while the session is still loading", () => {
    mockSession({ data: null, isPending: true });

    renderHook(() => useTelemetryIdentity());

    expect(identifyUser).not.toHaveBeenCalled();
    expect(resetIdentity).not.toHaveBeenCalled();
  });

  it("does not reset on an anonymous load with no prior sign-in", () => {
    mockSession({ data: null, isPending: false });

    renderHook(() => useTelemetryIdentity());

    expect(resetIdentity).not.toHaveBeenCalled();
  });

  it("resets identity on a sign-out transition", () => {
    mockSession({ data: { user: { id: "user-1" } }, isPending: false });
    const { rerender } = renderHook(() => useTelemetryIdentity());

    mockSession({ data: null, isPending: false });
    rerender();

    expect(resetIdentity).toHaveBeenCalledTimes(1);
  });
});
