import type { CheerioAPI } from "cheerio";

export interface ImageEntry {
  url: string;
  context: string;
  isStepImage: boolean;
}

export function extractStepImages($: CheerioAPI): string[] {
  const images: string[] = [];
  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("srcset")?.split(",")[0]?.trim()?.split(" ")[0] ||
      "";
    const cls = $(el).attr("class") || "";
    if (!src.startsWith("http")) return;
    if (cls.includes("step")) images.push(src);
  });
  return [...new Set(images)];
}

export function extractHeroImage($: CheerioAPI): string {
  let hero = "";
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const width = parseInt($(el).attr("width") || "0", 10);
    const height = parseInt($(el).attr("height") || "0", 10);
    const alt = $(el).attr("alt") || "";
    const cls = $(el).attr("class") || "";
    if (!src.startsWith("http")) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite"))
      return;
    if (cls.includes("logo") || cls.includes("icon")) return;
    if (alt.toLowerCase().includes("logo")) return;
    if ((width > 0 && width < 200) || (height > 0 && height < 200)) return;
    hero = src;
    return false; // break cheerio loop
  });
  return hero;
}

export function extractAllImages($: CheerioAPI): ImageEntry[] {
  const images: ImageEntry[] = [];
  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("srcset")?.split(",")[0]?.trim()?.split(" ")[0] ||
      "";
    if (!src.startsWith("http")) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite"))
      return;

    const cls = $(el).attr("class") || "";
    const alt = $(el).attr("alt") || "";
    const parent = $(el).parent();
    const context = (alt || parent.parent().text() || parent.text())
      .trim()
      .slice(0, 150);

    images.push({ url: src, context, isStepImage: cls.includes("step") });
  });
  return images.sort(
    (a, b) => (b.isStepImage ? 1 : 0) - (a.isStepImage ? 1 : 0),
  );
}

export function buildImagesText(images: ImageEntry[]): string {
  return images
    .map(
      (img) =>
        `${img.isStepImage ? "[STEP IMAGE]" : "[IMAGE]"} ${img.url} | ${img.context}`,
    )
    .join("\n");
}
