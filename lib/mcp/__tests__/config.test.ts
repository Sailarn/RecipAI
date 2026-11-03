import { describe, expect, it } from "vitest";
import { appOrigin, mcpResourceUrl } from "../config";

describe("appOrigin", () => {
  it("reduces the configured app URL to its origin", () => {
    expect(appOrigin("https://recip-ai-wine.vercel.app/")).toBe(
      "https://recip-ai-wine.vercel.app",
    );
    expect(appOrigin("https://example.com/some/path?x=1")).toBe(
      "https://example.com",
    );
  });

  it("falls back to localhost when unset or invalid", () => {
    expect(appOrigin("")).toBe("http://localhost:3000");
    expect(appOrigin("not a url")).toBe("http://localhost:3000");
  });
});

describe("mcpResourceUrl", () => {
  it("is the MCP endpoint on the app origin", () => {
    expect(mcpResourceUrl("https://recip-ai-wine.vercel.app")).toBe(
      "https://recip-ai-wine.vercel.app/api/mcp",
    );
  });
});
