import { describe, expect, it } from "vitest";
import { getGreeting } from "../greeting";

describe("getGreeting", () => {
  describe("morning", () => {
    it("returns 'morning' at midnight", () => {
      expect(getGreeting(0)).toBe("morning");
    });

    it("returns 'morning' at 6am", () => {
      expect(getGreeting(6)).toBe("morning");
    });

    it("returns 'morning' at 11am", () => {
      expect(getGreeting(11)).toBe("morning");
    });
  });

  describe("afternoon", () => {
    it("returns 'afternoon' at noon", () => {
      expect(getGreeting(12)).toBe("afternoon");
    });

    it("returns 'afternoon' at 3pm", () => {
      expect(getGreeting(15)).toBe("afternoon");
    });

    it("returns 'afternoon' at 5pm", () => {
      expect(getGreeting(17)).toBe("afternoon");
    });
  });

  describe("evening", () => {
    it("returns 'evening' at 6pm", () => {
      expect(getGreeting(18)).toBe("evening");
    });

    it("returns 'evening' at 9pm", () => {
      expect(getGreeting(21)).toBe("evening");
    });

    it("returns 'evening' at 11pm", () => {
      expect(getGreeting(23)).toBe("evening");
    });
  });
});
