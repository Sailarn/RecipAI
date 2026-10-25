import { describe, expect, it } from "vitest";
import { gridLayoutFor } from "../use-grid-layout";

describe("gridLayoutFor", () => {
  describe("phone widths", () => {
    it("keeps the two-column compact grid below 640px", () => {
      const layout = gridLayoutFor(390);

      expect(layout).toEqual({
        layout: "compact",
        columns: 2,
        estimatedRowHeight: 170,
      });
    });

    it("falls back to compact before the container is measured", () => {
      const layout = gridLayoutFor(0);

      expect(layout.layout).toBe("compact");
    });
  });

  describe("wide widths", () => {
    it("switches to tiles at 640px", () => {
      const layout = gridLayoutFor(640);

      expect(layout.layout).toBe("tile");
      expect(layout.columns).toBe(2);
    });

    it("packs ~300px tiles across a desktop width", () => {
      const layout = gridLayoutFor(2000);

      expect(layout.columns).toBe(6);
      expect(layout.estimatedRowHeight).toBe(330);
    });

    it("never drops below two columns", () => {
      const layout = gridLayoutFor(650);

      expect(layout.columns).toBe(2);
    });
  });
});
