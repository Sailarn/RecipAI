import { beforeEach, describe, expect, it, vi } from "vitest";

const { onConflictDoUpdate, insertValues, deleteWhere } = vi.hoisted(() => ({
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  insertValues: vi.fn(),
  deleteWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  },
}));
vi.mock("@/db/schema/push-subscriptions", () => ({
  pushSubscriptions: { endpoint: "endpoint" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), relations: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { auth } from "@/lib/auth/auth";
import { DELETE, POST } from "../route";

const validBody = {
  endpoint: "https://web.push.apple.com/abc",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Parameters<
    typeof POST
  >[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  insertValues.mockReturnValue({ onConflictDoUpdate });
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
});

describe("POST /api/push/subscribe", () => {
  it("returns 400 when endpoint is missing", async () => {
    const res = await POST(makeRequest({ keys: validBody.keys }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when keys are missing", async () => {
    const res = await POST(makeRequest({ endpoint: validBody.endpoint }));

    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = {
      json: () => Promise.reject(new Error("bad")),
    } as unknown as Parameters<typeof POST>[0];

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("upserts the subscription with the keys", async () => {
    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: validBody.endpoint,
        p256dh: "p256dh-key",
        auth: "auth-key",
      }),
    );
  });

  it("stores userId from session when logged in", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-7" },
    } as never);

    await POST(makeRequest(validBody));

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-7" }),
    );
  });

  it("stores null userId when anonymous", async () => {
    await POST(makeRequest(validBody));

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
  });

  it("stores null userId when the session id is an empty string", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "" },
    } as never);

    await POST(makeRequest(validBody));

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
  });
});

describe("DELETE /api/push/subscribe", () => {
  it("returns 400 when endpoint is missing", async () => {
    const res = await DELETE(makeRequest({}));

    expect(res.status).toBe(400);
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it("deletes the subscription by endpoint", async () => {
    const res = await DELETE(makeRequest({ endpoint: validBody.endpoint }));

    expect(res.status).toBe(200);
    expect(deleteWhere).toHaveBeenCalledOnce();
  });
});
