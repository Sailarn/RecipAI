import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "../route";

const PUBLIC_DIR = resolve(__dirname, "../../../../public");

describe("GET /api/manifest", () => {
  it("serves a manifest content type that is never cached", async () => {
    const response = await GET();

    expect(response.headers.get("content-type")).toBe(
      "application/manifest+json",
    );
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });

  it("points start_url and every icon at a file in public/", async () => {
    const manifest = await (await GET()).json();
    const files = [
      manifest.start_url,
      ...manifest.icons.map((icon: { src: string }) => icon.src),
    ];

    for (const file of files) {
      expect(existsSync(resolve(PUBLIC_DIR, `.${file}`)), file).toBe(true);
    }
  });
});
