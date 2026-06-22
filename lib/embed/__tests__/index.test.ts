import { afterEach, describe, expect, it, vi } from "vitest";
import { parseProviders } from "../index";

afterEach(() => vi.unstubAllEnvs());

describe("parseProviders", () => {
  it("builds a local provider from 'local'", () => {
    const providers = parseProviders("local", "secret");

    expect(providers.map((provider) => provider.name)).toEqual(["local"]);
  });

  it("builds ordered http providers from a comma list", () => {
    const providers = parseProviders(
      "http:https://a.example,http:https://b.example",
      "secret",
    );

    expect(providers.map((provider) => provider.name)).toEqual([
      "http:https://a.example",
      "http:https://b.example",
    ]);
  });

  it("returns no providers for an empty config", () => {
    expect(parseProviders("", "secret")).toEqual([]);
  });
});
