import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { trimChrome } from "../web";

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

describe("trimChrome", () => {
  it("removes a large, link-dense navigation block", () => {
    const navLinks = Array.from(
      { length: 40 },
      (_, index) => `<a href="/c/${index}">Category number ${index}</a>`,
    ).join("");
    const $ = cheerio.load(
      `<body><nav>${navLinks}</nav><div id="recipe">Boil the pasta until al dente, then drain.</div></body>`,
    );

    trimChrome($);

    expect($("nav").length).toBe(0);
    expect(clean($("body").text())).toContain("Boil the pasta");
  });

  it("keeps prose blocks even when they contain a few links", () => {
    const $ = cheerio.load(
      `<body><div id="recipe">Mix the flour and eggs, knead for ten minutes, then rest the dough. See our <a href="/x">guide</a> for tips.</div></body>`,
    );

    trimChrome($);

    expect(clean($("body").text())).toContain("knead for ten minutes");
  });

  it("leaves small blocks alone regardless of link density", () => {
    const $ = cheerio.load(
      `<body><div id="crumbs"><a href="/">Home</a><a href="/r">Recipes</a></div></body>`,
    );

    trimChrome($);

    expect($("#crumbs").length).toBe(1);
  });
});
