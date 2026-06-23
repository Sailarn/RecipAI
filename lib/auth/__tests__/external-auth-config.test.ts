import { describe, expect, it } from "vitest";
import {
  assertSeparateAuthOrigins,
  DEVICE_POLL_INTERVAL_MS,
  EXTERNAL_AUTH_TTL_MS,
  getAllowedAuthHosts,
  getExternalAuthUrl,
  PWA_AUTH_CLIENT_ID,
  validatePwaClient,
} from "../external-auth-config";

describe("getExternalAuthUrl", () => {
  it("falls back to the local app URL", () => {
    expect(getExternalAuthUrl({})).toBe("http://localhost:3000");
  });

  it("removes the trailing slash from the configured URL", () => {
    expect(
      getExternalAuthUrl({ configuredUrl: "https://auth.recipai.pp.ua/" }),
    ).toBe("https://auth.recipai.pp.ua");
  });
});

describe("external auth constants", () => {
  it("uses the fixed PWA client ID", () => {
    expect(PWA_AUTH_CLIENT_ID).toBe("recipai-pwa");
  });

  it("expires external auth requests after five minutes", () => {
    expect(EXTERNAL_AUTH_TTL_MS).toBe(300_000);
  });

  it("polls for device auth every five seconds", () => {
    expect(DEVICE_POLL_INTERVAL_MS).toBe(5_000);
  });
});

describe("assertSeparateAuthOrigins", () => {
  it("throws when the app and external auth use the same origin", () => {
    expect(() =>
      assertSeparateAuthOrigins(
        "https://recipai.pp.ua",
        "https://recipai.pp.ua",
      ),
    ).toThrow(/separate origin/i);
  });

  it("allows distinct app and external auth origins", () => {
    expect(() =>
      assertSeparateAuthOrigins(
        "https://recipai.pp.ua",
        "https://auth.recipai.pp.ua",
      ),
    ).not.toThrow();
  });
});

describe("getAllowedAuthHosts", () => {
  it("returns only the two exact production hosts", () => {
    expect(getAllowedAuthHosts("production")).toEqual([
      "recipai.pp.ua",
      "auth.recipai.pp.ua",
    ]);
  });

  it("includes the configured LAN host without a broad hostname wildcard", () => {
    const hosts = getAllowedAuthHosts(
      "development",
      "http://192.168.50.18:3000",
    );

    expect(hosts).toEqual(
      expect.arrayContaining([
        "localhost",
        "localhost:*",
        "127.0.0.1",
        "127.0.0.1:*",
        "192.168.50.18:3000",
        "*.vercel.app",
      ]),
    );
    expect(hosts).not.toContain("192.168.*.*:*");
  });
});

describe("validatePwaClient", () => {
  it("accepts the fixed PWA client ID", () => {
    expect(validatePwaClient("recipai-pwa")).toBe(true);
  });

  it("rejects any other client ID", () => {
    expect(validatePwaClient("recipai-pwa-preview")).toBe(false);
  });
});
