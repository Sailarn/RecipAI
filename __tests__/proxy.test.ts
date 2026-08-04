import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAppAvailable } from "@/lib/maintenance";
import proxy, { config } from "@/proxy";

const intlMiddleware = vi.hoisted(() => vi.fn(() => NextResponse.next()));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() => intlMiddleware),
}));

vi.mock("@/lib/maintenance", () => ({
  ensureAppAvailable: vi.fn().mockResolvedValue(null),
}));

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`https://recipai.test${pathname}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureAppAvailable).mockResolvedValue(null);
  intlMiddleware.mockReturnValue(NextResponse.next());
});

describe("proxy", () => {
  it("gates non-exempt API routes during maintenance", async () => {
    vi.mocked(ensureAppAvailable).mockResolvedValue(
      NextResponse.json(
        { error: "Maintenance window", code: "MAINTENANCE_MODE" },
        { status: 503 },
      ),
    );

    const response = await proxy(makeRequest("/api/recipes"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Maintenance window",
      code: "MAINTENANCE_MODE",
    });
    expect(intlMiddleware).not.toHaveBeenCalled();
  });

  it("lets auth API routes through during maintenance", async () => {
    vi.mocked(ensureAppAvailable).mockResolvedValue(
      NextResponse.json({ error: "Maintenance" }, { status: 503 }),
    );

    const response = await proxy(makeRequest("/api/auth/session"));

    expect(response.status).toBe(200);
    expect(ensureAppAvailable).not.toHaveBeenCalled();
    expect(intlMiddleware).not.toHaveBeenCalled();
  });

  it("lets manifest API route through during maintenance", async () => {
    vi.mocked(ensureAppAvailable).mockResolvedValue(
      NextResponse.json({ error: "Maintenance" }, { status: 503 }),
    );

    const response = await proxy(makeRequest("/api/manifest"));

    expect(response.status).toBe(200);
    expect(ensureAppAvailable).not.toHaveBeenCalled();
    expect(intlMiddleware).not.toHaveBeenCalled();
  });

  it("delegates non-api paths to next-intl", async () => {
    const request = makeRequest("/en/recipes");

    await proxy(request);

    expect(intlMiddleware).toHaveBeenCalledWith(request);
    expect(ensureAppAvailable).not.toHaveBeenCalled();
  });

  it("sends a next-intl locale-root redirect straight to the recipes list", async () => {
    intlMiddleware.mockReturnValue(
      NextResponse.redirect("https://recipai.test/ua"),
    );

    const response = await proxy(makeRequest("/"));

    expect(response.headers.get("location")).toBe(
      "https://recipai.test/ua/recipes",
    );
  });

  it("redirects a directly requested locale root to the recipes list", async () => {
    const response = await proxy(makeRequest("/en"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://recipai.test/en/recipes",
    );
  });

  it("leaves redirects to non-locale-root paths untouched", async () => {
    intlMiddleware.mockReturnValue(
      NextResponse.redirect("https://recipai.test/ua/login"),
    );

    const response = await proxy(makeRequest("/login"));

    expect(response.headers.get("location")).toBe(
      "https://recipai.test/ua/login",
    );
  });

  it("matches API requests", () => {
    expect(config).toEqual(
      expect.objectContaining({
        matcher: expect.arrayContaining(["/api/:path*"]),
      }),
    );
  });
});
