import { describe, expect, it } from "vitest";
import { shouldPrewarmLocalEmbed } from "../instrumentation";

describe("shouldPrewarmLocalEmbed", () => {
  it("pre-warms in the nodejs runtime when the local provider is configured", () => {
    expect(shouldPrewarmLocalEmbed("local", "nodejs")).toBe(true);
  });

  it("pre-warms when local is one of several providers", () => {
    expect(
      shouldPrewarmLocalEmbed("http:https://a.example, local", "nodejs"),
    ).toBe(true);
  });

  it("does not pre-warm when only http providers are configured (Vercel)", () => {
    expect(
      shouldPrewarmLocalEmbed("http:https://recipai.pp.ua", "nodejs"),
    ).toBe(false);
  });

  it("does not pre-warm in the edge runtime", () => {
    expect(shouldPrewarmLocalEmbed("local", "edge")).toBe(false);
  });

  it("does not pre-warm with an empty provider config", () => {
    expect(shouldPrewarmLocalEmbed("", "nodejs")).toBe(false);
  });
});
