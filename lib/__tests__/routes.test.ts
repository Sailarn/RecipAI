import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { api, routes } from "../routes";

const APP_DIR = resolve(__dirname, "../../app");

// Walks the App Router tree the way Next matches a URL: a literal folder
// first, otherwise a [param] folder at that level.
function routeFileExists(path: string, file: "route.ts" | "page.tsx"): boolean {
  let dir = APP_DIR;
  for (const segment of path.split("/").filter(Boolean)) {
    const literal = join(dir, segment);
    if (existsSync(literal)) {
      dir = literal;
      continue;
    }
    const dynamic = readdirSync(dir).find(
      (entry) => entry.startsWith("[") && !entry.startsWith("[..."),
    );
    if (!dynamic) return false;
    dir = join(dir, dynamic);
  }
  return existsSync(join(dir, file));
}

function allApiPaths(): string[] {
  const paths: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") paths.push(value);
    else if (typeof value === "function") paths.push(value("some-id"));
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(api);
  return paths;
}

describe("api", () => {
  it.each(allApiPaths())("%s has a route handler", (path) => {
    expect(routeFileExists(path, "route.ts")).toBe(true);
  });
});

function allPagePaths(): string[] {
  const paths: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "function") {
      const built: string =
        value.length === 2 ? value("uk", "some-id") : value("uk");
      paths.push(built.split("?")[0]);
    } else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(routes);
  return paths;
}

describe("routes", () => {
  it.each(allPagePaths())("%s has a page", (path) => {
    expect(routeFileExists(path, "page.tsx")).toBe(true);
  });

  it("prefixes page routes with the locale", () => {
    expect(routes.recipes.list("uk")).toBe("/uk/recipes");
    expect(routes.recipes.edit("en", "r1")).toBe("/en/recipes/r1/edit");
    expect(routes.pantry("uk")).toBe("/uk/pantry");
  });

  it("encodes external-auth query values", () => {
    expect(routes.externalAuth.device("AB CD&x", "uk")).toBe(
      "/external-auth/device?user_code=AB%20CD%26x&locale=uk",
    );
  });
});
