import { describe, expect, it } from "vitest";
import { toMeasurementUnit, unitLabel } from "@/lib/units";

describe("toMeasurementUnit", () => {
  describe("canonical codes", () => {
    it("maps every stored code to itself", () => {
      const codes = ["g", "kg", "ml", "l", "tsp", "tbsp", "pcs"];

      const resolved = codes.map((code) => toMeasurementUnit(code));

      expect(resolved).toEqual(codes);
    });
  });

  describe("spelling variants", () => {
    it("collapses spacing and periods", () => {
      expect(toMeasurementUnit("ч. л.")).toBe("tsp");
      expect(toMeasurementUnit("ч.л.")).toBe("tsp");
      expect(toMeasurementUnit("чл")).toBe("tsp");
      expect(toMeasurementUnit("tbsp.")).toBe("tbsp");
    });

    it("ignores case", () => {
      expect(toMeasurementUnit("KG")).toBe("kg");
      expect(toMeasurementUnit("Гр")).toBe("g");
    });

    it("resolves Ukrainian and Russian spellings to the same code", () => {
      expect(toMeasurementUnit("грам")).toBe("g");
      expect(toMeasurementUnit("граммов")).toBe("g");
      expect(toMeasurementUnit("шт")).toBe("pcs");
      expect(toMeasurementUnit("штук")).toBe("pcs");
      expect(toMeasurementUnit("літрів")).toBe("l");
      expect(toMeasurementUnit("литров")).toBe("l");
    });

    it("resolves long-form English spellings", () => {
      expect(toMeasurementUnit("tablespoons")).toBe("tbsp");
      expect(toMeasurementUnit("teaspoon")).toBe("tsp");
      expect(toMeasurementUnit("pieces")).toBe("pcs");
      expect(toMeasurementUnit("millilitres")).toBe("ml");
    });
  });

  describe("unknown values", () => {
    it("returns null so the caller can keep the raw text", () => {
      expect(toMeasurementUnit("щіпка")).toBeNull();
      expect(toMeasurementUnit("bunch")).toBeNull();
      expect(toMeasurementUnit("")).toBeNull();
    });
  });
});

describe("unitLabel", () => {
  describe("ua locale", () => {
    it("localizes the stored English code", () => {
      expect(unitLabel("g", "ua")).toBe("г");
      expect(unitLabel("kg", "ua")).toBe("кг");
      expect(unitLabel("ml", "ua")).toBe("мл");
      expect(unitLabel("l", "ua")).toBe("л");
      expect(unitLabel("tsp", "ua")).toBe("ч. л.");
      expect(unitLabel("tbsp", "ua")).toBe("ст. л.");
      expect(unitLabel("pcs", "ua")).toBe("шт");
    });
  });

  describe("en locale", () => {
    it("keeps the canonical code", () => {
      expect(unitLabel("tbsp", "en")).toBe("tbsp");
      expect(unitLabel("pcs", "en")).toBe("pcs");
    });

    it("normalizes a Ukrainian value that reached the field", () => {
      expect(unitLabel("г", "en")).toBe("g");
      expect(unitLabel("ст. л.", "en")).toBe("tbsp");
    });
  });

  describe("unrecognised units", () => {
    it("returns the stored text untouched in both locales", () => {
      expect(unitLabel("щіпка", "ua")).toBe("щіпка");
      expect(unitLabel("щіпка", "en")).toBe("щіпка");
      expect(unitLabel("bunch", "ua")).toBe("bunch");
    });
  });
});
