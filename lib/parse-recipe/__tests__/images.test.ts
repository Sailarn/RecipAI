import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { buildImagesText, extractAllImages, extractHeroImage } from "../images";

describe("extractHeroImage", () => {
  describe("filtering", () => {
    it("skips relative, logo, icon and small images", () => {
      const $ = load(`
        <img src="/relative.jpg">
        <img src="https://cdn.test/logo.png">
        <img src="https://cdn.test/a.jpg" class="site-icon">
        <img src="https://cdn.test/b.jpg" alt="Brand Logo">
        <img src="https://cdn.test/thumb.jpg" width="120" height="400">
        <img src="https://cdn.test/hero.jpg" width="1200" height="800">
      `);

      const hero = extractHeroImage($);

      expect(hero).toBe("https://cdn.test/hero.jpg");
    });

    it("falls back to data-src for lazy-loaded images", () => {
      const $ = load(`<img data-src="https://cdn.test/lazy.jpg">`);

      expect(extractHeroImage($)).toBe("https://cdn.test/lazy.jpg");
    });
  });

  describe("selection", () => {
    it("returns the first qualifying image", () => {
      const $ = load(`
        <img src="https://cdn.test/first.jpg">
        <img src="https://cdn.test/second.jpg">
      `);

      expect(extractHeroImage($)).toBe("https://cdn.test/first.jpg");
    });

    it("returns an empty string when nothing qualifies", () => {
      const $ = load(`<img src="https://cdn.test/sprite.png">`);

      expect(extractHeroImage($)).toBe("");
    });
  });
});

describe("extractAllImages", () => {
  it("reads src, data-src or the first srcset candidate", () => {
    const $ = load(`
      <img src="https://cdn.test/a.jpg" alt="A">
      <img data-src="https://cdn.test/b.jpg" alt="B">
      <img srcset="https://cdn.test/c-1x.jpg 1x, https://cdn.test/c-2x.jpg 2x" alt="C">
    `);

    const urls = extractAllImages($).map((image) => image.url);

    expect(urls).toEqual([
      "https://cdn.test/a.jpg",
      "https://cdn.test/b.jpg",
      "https://cdn.test/c-1x.jpg",
    ]);
  });

  it("sorts step images first and flags them", () => {
    const $ = load(`
      <img src="https://cdn.test/plain.jpg" alt="Plain">
      <img src="https://cdn.test/step.jpg" class="recipe-step-img" alt="Step">
    `);

    const images = extractAllImages($);

    expect(images[0]).toEqual({
      url: "https://cdn.test/step.jpg",
      context: "Step",
      isStepImage: true,
    });
    expect(images[1].isStepImage).toBe(false);
  });

  it("takes context from surrounding text when there is no alt, capped at 150 chars", () => {
    const longText = "x".repeat(200);
    const $ = load(
      `<div><figure><img src="https://cdn.test/a.jpg"></figure><p>${longText}</p></div>`,
    );

    const [image] = extractAllImages($);

    expect(image.context).toHaveLength(150);
  });

  it("drops relative and logo/icon/sprite urls", () => {
    const $ = load(`
      <img src="/local.jpg">
      <img src="https://cdn.test/icon-set.png">
    `);

    expect(extractAllImages($)).toEqual([]);
  });
});

describe("buildImagesText", () => {
  it("labels each image on its own line", () => {
    const text = buildImagesText([
      { url: "https://cdn.test/s.jpg", context: "Whisk", isStepImage: true },
      { url: "https://cdn.test/p.jpg", context: "Plated", isStepImage: false },
    ]);

    expect(text).toBe(
      "[STEP IMAGE] https://cdn.test/s.jpg | Whisk\n[IMAGE] https://cdn.test/p.jpg | Plated",
    );
  });
});
