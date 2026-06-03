import type { CheerioAPI } from "cheerio";

export interface ImageEntry {
  url: string;
  context: string;
  isStepImage: boolean;
}

export function extractStepImages($: CheerioAPI): string[] {
  const images: string[] = [];
  $("img").each((_, element) => {
    const src =
      $(element).attr("src") ||
      $(element).attr("data-src") ||
      $(element).attr("srcset")?.split(",")[0]?.trim()?.split(" ")[0] ||
      "";
    const classAttr = $(element).attr("class") || "";
    if (!src.startsWith("http")) return;
    if (classAttr.includes("step")) images.push(src);
  });
  return [...new Set(images)];
}

export function extractHeroImage($: CheerioAPI): string {
  let hero = "";
  $("img").each((_, element) => {
    const src = $(element).attr("src") || $(element).attr("data-src") || "";
    const width = parseInt($(element).attr("width") || "0", 10);
    const height = parseInt($(element).attr("height") || "0", 10);
    const alt = $(element).attr("alt") || "";
    const classAttr = $(element).attr("class") || "";
    if (!src.startsWith("http")) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite"))
      return;
    if (classAttr.includes("logo") || classAttr.includes("icon")) return;
    if (alt.toLowerCase().includes("logo")) return;
    if ((width > 0 && width < 200) || (height > 0 && height < 200)) return;
    hero = src;
    return false; // break cheerio loop
  });
  return hero;
}

export function extractAllImages($: CheerioAPI): ImageEntry[] {
  const images: ImageEntry[] = [];
  $("img").each((_, element) => {
    const src =
      $(element).attr("src") ||
      $(element).attr("data-src") ||
      $(element).attr("srcset")?.split(",")[0]?.trim()?.split(" ")[0] ||
      "";
    if (!src.startsWith("http")) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite"))
      return;

    const classAttr = $(element).attr("class") || "";
    const alt = $(element).attr("alt") || "";
    const parent = $(element).parent();
    const context = (alt || parent.parent().text() || parent.text())
      .trim()
      .slice(0, 150);

    images.push({ url: src, context, isStepImage: classAttr.includes("step") });
  });
  return images.sort(
    (a, b) => (b.isStepImage ? 1 : 0) - (a.isStepImage ? 1 : 0),
  );
}

export function buildImagesText(images: ImageEntry[]): string {
  return images
    .map(
      (image) =>
        `${image.isStepImage ? "[STEP IMAGE]" : "[IMAGE]"} ${image.url} | ${image.context}`,
    )
    .join("\n");
}
