import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

import { requireSession } from "../require-session";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSession", () => {
  it("returns the session when one exists", async () => {
    const session = { user: { id: "user-1" }, session: { id: "s1" } };
    mockGetSession.mockResolvedValue(session);

    const authed = await requireSession();

    expect(authed).toEqual({ session });
  });

  it("returns a 401 response when signed out", async () => {
    mockGetSession.mockResolvedValue(null);

    const authed = await requireSession();

    expect(authed.session).toBeUndefined();
    expect(authed.response?.status).toBe(401);
  });
});
