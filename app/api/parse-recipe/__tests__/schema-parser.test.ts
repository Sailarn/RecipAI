import { describe, expect, it } from "vitest";
import { extractSchemaRecipe } from "../schema-parser";

// Wraps a JSON-LD object in minimal HTML
function makeHtml(...jsonLdBlocks: object[]): string {
  const scripts = jsonLdBlocks
    .map(
      (block) =>
        `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
    )
    .join("\n");
  return `<html><head>${scripts}</head><body></body></html>`;
}

function baseRecipe(overrides: Record<string, unknown> = {}): object {
  return {
    "@type": "Recipe",
    name: "Test Pasta",
    recipeYield: 4,
    recipeIngredient: ["2 cups flour"],
    recipeInstructions: [{ "@type": "HowToStep", text: "Boil water" }],
    ...overrides,
  };
}

// ─── null cases ────────────────────────────────────────────────────────────

describe("returns null", () => {
  it("when there are no JSON-LD script tags", () => {
    expect(
      extractSchemaRecipe("<html><body>No schema</body></html>"),
    ).toBeNull();
  });

  it("when JSON-LD is present but not a Recipe type", () => {
    const html = makeHtml({ "@type": "WebPage", name: "Some page" });
    expect(extractSchemaRecipe(html)).toBeNull();
  });

  it("when JSON-LD is malformed and there are no other blocks", () => {
    const html = `<html><head><script type="application/ld+json">not valid json {{{</script></head></html>`;
    expect(extractSchemaRecipe(html)).toBeNull();
  });
});

// ─── @type variations ──────────────────────────────────────────────────────

describe("@type handling", () => {
  it("finds recipe when @type is a plain string", () => {
    expect(extractSchemaRecipe(makeHtml(baseRecipe()))).not.toBeNull();
  });

  it("finds recipe when @type is an array containing 'Recipe'", () => {
    const html = makeHtml(baseRecipe({ "@type": ["Recipe", "Thing"] }));
    expect(extractSchemaRecipe(html)).not.toBeNull();
  });
});

// ─── @graph wrapper ────────────────────────────────────────────────────────

describe("@graph wrapper", () => {
  it("extracts recipe from @graph array", () => {
    const html = makeHtml({
      "@graph": [
        { "@type": "WebPage", name: "Site" },
        baseRecipe({ name: "Graph Pasta" }),
      ],
    });
    const result = extractSchemaRecipe(html);
    expect(result?.title).toBe("Graph Pasta");
  });
});

// ─── multiple JSON-LD blocks ───────────────────────────────────────────────

describe("multiple JSON-LD blocks", () => {
  it("skips non-recipe block and finds recipe in the next one", () => {
    const html = makeHtml(
      { "@type": "WebPage" },
      baseRecipe({ name: "Second Block Recipe" }),
    );
    const result = extractSchemaRecipe(html);
    expect(result?.title).toBe("Second Block Recipe");
  });

  it("skips malformed block and finds recipe in the next one", () => {
    const html =
      `<html><head>` +
      `<script type="application/ld+json">INVALID{{{</script>` +
      `<script type="application/ld+json">${JSON.stringify(baseRecipe({ name: "Valid Recipe" }))}</script>` +
      `</head></html>`;
    const result = extractSchemaRecipe(html);
    expect(result?.title).toBe("Valid Recipe");
  });
});

// ─── servings (recipeYield) ────────────────────────────────────────────────

describe("servings extraction", () => {
  it("parses numeric recipeYield directly", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeYield: 6 })),
    );
    expect(result?.servings).toBe(6);
  });

  it("parses servings from string like '4 servings'", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeYield: "4 servings" })),
    );
    expect(result?.servings).toBe(4);
  });

  it("parses servings from array (takes first element)", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeYield: ["2 portions"] })),
    );
    expect(result?.servings).toBe(2);
  });

  it("defaults to 4 when recipeYield is absent", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeYield: undefined })),
    );
    expect(result?.servings).toBe(4);
  });
});

// ─── parseDuration (via prepTime / cookTime) ───────────────────────────────

describe("duration parsing (ISO 8601)", () => {
  it("parses PT30M as 30 minutes", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ prepTime: "PT30M" })),
    );
    expect(result?.prepTime).toBe(30);
  });

  it("parses PT1H30M as 90 minutes", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ cookTime: "PT1H30M" })),
    );
    expect(result?.cookTime).toBe(90);
  });

  it("parses P1DT2H as 1560 minutes", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ prepTime: "P1DT2H" })),
    );
    expect(result?.prepTime).toBe(1560);
  });

  it("accepts a number directly", () => {
    const result = extractSchemaRecipe(makeHtml(baseRecipe({ prepTime: 45 })));
    expect(result?.prepTime).toBe(45);
  });

  it("returns undefined when duration is absent", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ prepTime: undefined })),
    );
    expect(result?.prepTime).toBeUndefined();
  });
});

// ─── parseIngredient (via recipeIngredient) ────────────────────────────────

describe("ingredient parsing", () => {
  function parse(ingredientString: string) {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeIngredient: [ingredientString] })),
    );
    return result?.ingredients[0];
  }

  it("parses standard 'amount unit item' format", () => {
    expect(parse("2 cups flour")).toEqual({
      amount: 2,
      unit: "cups",
      item: "flour",
    });
  });

  it("parses fraction notation '1/2 cup milk'", () => {
    const ing = parse("1/2 cup milk");
    expect(ing?.amount).toBeCloseTo(0.5);
    expect(ing?.unit).toBe("cup");
    expect(ing?.item).toBe("milk");
  });

  it("normalizes unicode fraction ½", () => {
    const ing = parse("½ cup sugar");
    expect(ing?.amount).toBeCloseTo(0.5);
    expect(ing?.unit).toBe("cup");
    expect(ing?.item).toBe("sugar");
  });

  it("normalizes unicode fraction ¼", () => {
    const ing = parse("¼ tsp salt");
    expect(ing?.amount).toBeCloseTo(0.25);
  });

  it("parses Ukrainian style 'item — amount unit'", () => {
    expect(parse("Фетучині — 250 г")).toEqual({
      amount: 250,
      unit: "г",
      item: "Фетучині",
    });
  });

  it("returns item-only when no amount matches", () => {
    expect(parse("Salt to taste")).toEqual({
      amount: undefined,
      unit: undefined,
      item: "Salt to taste",
    });
  });
});

// ─── instructions ──────────────────────────────────────────────────────────

describe("instruction parsing", () => {
  it("extracts text from HowToStep", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: [{ "@type": "HowToStep", text: "Boil water" }],
        }),
      ),
    );
    expect(result?.instructions[0]).toMatchObject({
      order: 1,
      instruction: "Boil water",
    });
  });

  it("falls back to name when HowToStep has no text", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: [{ "@type": "HowToStep", name: "Chop onions" }],
        }),
      ),
    );
    expect(result?.instructions[0].instruction).toBe("Chop onions");
  });

  it("extracts step image as string", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: [
            {
              "@type": "HowToStep",
              text: "Fry",
              image: "https://img.example.com/step1.jpg",
            },
          ],
        }),
      ),
    );
    expect(result?.instructions[0].imageUrl).toBe(
      "https://img.example.com/step1.jpg",
    );
  });

  it("extracts step image from array (takes first)", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: [
            {
              "@type": "HowToStep",
              text: "Fry",
              image: [
                "https://img.example.com/a.jpg",
                "https://img.example.com/b.jpg",
              ],
            },
          ],
        }),
      ),
    );
    expect(result?.instructions[0].imageUrl).toBe(
      "https://img.example.com/a.jpg",
    );
  });

  it("extracts step image from object with url", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: [
            {
              "@type": "HowToStep",
              text: "Fry",
              image: { url: "https://img.example.com/step.jpg" },
            },
          ],
        }),
      ),
    );
    expect(result?.instructions[0].imageUrl).toBe(
      "https://img.example.com/step.jpg",
    );
  });

  it("splits plain string instructions by newline", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: "Step one\nStep two\nStep three",
        }),
      ),
    );
    expect(result?.instructions).toHaveLength(3);
    expect(result?.instructions[0].instruction).toBe("Step one");
    expect(result?.instructions[2].order).toBe(3);
  });

  it("assigns correct order numbers", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          recipeInstructions: [
            { "@type": "HowToStep", text: "First" },
            { "@type": "HowToStep", text: "Second" },
          ],
        }),
      ),
    );
    expect(result?.instructions[0].order).toBe(1);
    expect(result?.instructions[1].order).toBe(2);
  });
});

// ─── image extraction ──────────────────────────────────────────────────────

describe("image extraction", () => {
  it("uses image string directly", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ image: "https://img.example.com/pasta.jpg" })),
    );
    expect(result?.imageUrl).toBe("https://img.example.com/pasta.jpg");
  });

  it("takes first item from image array", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({
          image: [
            "https://img.example.com/a.jpg",
            "https://img.example.com/b.jpg",
          ],
        }),
      ),
    );
    expect(result?.imageUrl).toBe("https://img.example.com/a.jpg");
  });

  it("reads url from image object", () => {
    const result = extractSchemaRecipe(
      makeHtml(
        baseRecipe({ image: { url: "https://img.example.com/obj.jpg" } }),
      ),
    );
    expect(result?.imageUrl).toBe("https://img.example.com/obj.jpg");
  });
});

// ─── category ──────────────────────────────────────────────────────────────

describe("category extraction", () => {
  it("extracts string category", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeCategory: "Dinner" })),
    );
    expect(result?.category).toBe("Dinner");
  });

  it("takes first item from array category", () => {
    const result = extractSchemaRecipe(
      makeHtml(baseRecipe({ recipeCategory: ["Lunch", "Dinner"] })),
    );
    expect(result?.category).toBe("Lunch");
  });
});
