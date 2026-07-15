import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import {
  prewarmRecipeImage,
  prewarmRecipeImages,
  selectPrewarmUrls,
} from "../prewarm-recipe-images";

const IMAGEKIT_ENDPOINT = "https://ik.imagekit.io/demo";

const mockRecipe = (id: string, imageUrl?: string): Recipe =>
  ({
    id,
    title: id,
    imageUrl,
    servings: 1,
    ingredients: [],
    instructions: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }) as Recipe;

describe("selectPrewarmUrls", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", IMAGEKIT_ENDPOINT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the hero-size ImageKit url for each recipe with an ImageKit image", () => {
    const urls = selectPrewarmUrls([
      mockRecipe("a", `${IMAGEKIT_ENDPOINT}/a.jpg`),
    ]);

    expect(urls).toEqual([`${IMAGEKIT_ENDPOINT}/a.jpg?tr=w-800,f-webp,q-80`]);
  });

  it("skips recipes with non-ImageKit or missing images", () => {
    const urls = selectPrewarmUrls([
      mockRecipe("a", "https://other.example.com/x.jpg"),
      mockRecipe("b", undefined),
      mockRecipe("c", ""),
    ]);

    expect(urls).toEqual([]);
  });

  it("dedupes recipes that share the same image url", () => {
    const shared = `${IMAGEKIT_ENDPOINT}/shared.jpg`;
    const urls = selectPrewarmUrls([
      mockRecipe("a", shared),
      mockRecipe("b", shared),
    ]);

    expect(urls).toHaveLength(1);
  });
});

// Fake <img> that resolves/rejects on the next microtask when .src is set,
// controllable per-instance via the `outcomes` queue (shift in creation order).
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";

  set src(value: string) {
    this._src = value;
    const outcome = FakeImage.outcomes.shift() ?? "load";
    queueMicrotask(() => {
      if (outcome === "load") this.onload?.();
      else this.onerror?.();
    });
  }
  get src() {
    return this._src;
  }

  static outcomes: Array<"load" | "error"> = [];
  static reset() {
    FakeImage.outcomes = [];
  }
}

async function flushMicrotasks(times = 1) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("prewarmRecipeImages / prewarmRecipeImage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", IMAGEKIT_ENDPOINT);
    vi.stubGlobal("Image", FakeImage);
    // Run idle callbacks synchronously so the queue drains without real timers.
    vi.stubGlobal(
      "requestIdleCallback",
      (callback: () => void) => queueMicrotask(callback) as unknown as number,
    );
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    Object.defineProperty(navigator, "connection", {
      value: undefined,
      configurable: true,
    });
    FakeImage.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("caps the bulk prewarm batch instead of warming an entire library", async () => {
    const recipes = Array.from({ length: 20 }, (_, index) =>
      mockRecipe(`r${index}`, `${IMAGEKIT_ENDPOINT}/${index}.jpg`),
    );
    FakeImage.outcomes = Array(20).fill("load");
    const srcs: string[] = [];
    const OriginalImage = FakeImage;
    vi.stubGlobal(
      "Image",
      class extends OriginalImage {
        set src(value: string) {
          srcs.push(value);
          super.src = value;
        }
        get src() {
          return super.src;
        }
      },
    );

    prewarmRecipeImages(recipes);
    await flushMicrotasks(40);

    expect(srcs.length).toBeLessThanOrEqual(12);
  });

  it("does not warm anything on a data-saver connection", async () => {
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    });
    let constructed = 0;
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        constructor() {
          super();
          constructed++;
        }
      },
    );

    prewarmRecipeImages([mockRecipe("a", `${IMAGEKIT_ENDPOINT}/a.jpg`)]);
    await flushMicrotasks(5);

    expect(constructed).toBe(0);
  });

  it("does not warm anything on a slow-2g effectiveType", async () => {
    Object.defineProperty(navigator, "connection", {
      value: { effectiveType: "slow-2g" },
      configurable: true,
    });
    let constructed = 0;
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        constructor() {
          super();
          constructed++;
        }
      },
    );

    prewarmRecipeImages([mockRecipe("a", `${IMAGEKIT_ENDPOINT}/a.jpg`)]);
    await flushMicrotasks(5);

    expect(constructed).toBe(0);
  });

  it("allows retrying a recipe whose prewarm failed on an earlier call", async () => {
    const recipe = mockRecipe("retry-me", `${IMAGEKIT_ENDPOINT}/retry.jpg`);

    FakeImage.outcomes = ["error"];
    prewarmRecipeImages([recipe]);
    await flushMicrotasks(5);

    let constructedSecondRound = 0;
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        constructor() {
          super();
          constructedSecondRound++;
        }
      },
    );
    FakeImage.outcomes = ["load"];
    prewarmRecipeImages([recipe]);
    await flushMicrotasks(5);

    expect(constructedSecondRound).toBe(1);
  });

  it("does not retry a recipe that already succeeded", async () => {
    const recipe = mockRecipe("ok", `${IMAGEKIT_ENDPOINT}/ok.jpg`);

    FakeImage.outcomes = ["load"];
    prewarmRecipeImages([recipe]);
    await flushMicrotasks(5);

    let constructedSecondRound = 0;
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        constructor() {
          super();
          constructedSecondRound++;
        }
      },
    );
    prewarmRecipeImages([recipe]);
    await flushMicrotasks(5);

    expect(constructedSecondRound).toBe(0);
  });

  it("prewarmRecipeImage warms a single recipe immediately, skipped on data-saver", async () => {
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    });
    let constructed = 0;
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        constructor() {
          super();
          constructed++;
        }
      },
    );

    prewarmRecipeImage(mockRecipe("single", `${IMAGEKIT_ENDPOINT}/single.jpg`));
    await flushMicrotasks(5);

    expect(constructed).toBe(0);
  });

  it("pauses warming while the tab is hidden and resumes on visibilitychange", async () => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    let constructed = 0;
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        constructor() {
          super();
          constructed++;
        }
      },
    );

    prewarmRecipeImages([
      mockRecipe("hidden-case", `${IMAGEKIT_ENDPOINT}/hidden-case.jpg`),
    ]);
    await flushMicrotasks(5);
    expect(constructed).toBe(0);

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushMicrotasks(5);

    expect(constructed).toBe(1);
  });

  it("prewarmRecipeImage constructs an Image with the hero-size url when online", () => {
    let lastSrc = "";
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        set src(value: string) {
          lastSrc = value;
          super.src = value;
        }
        get src() {
          return super.src;
        }
      },
    );

    prewarmRecipeImage(
      mockRecipe("single2", `${IMAGEKIT_ENDPOINT}/single2.jpg`),
    );

    expect(lastSrc).toBe(
      `${IMAGEKIT_ENDPOINT}/single2.jpg?tr=w-800,f-webp,q-80`,
    );
  });
});
