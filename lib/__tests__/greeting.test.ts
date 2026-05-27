import { describe, expect, it } from "vitest";
import { getGreeting } from "../greeting";

describe("getGreeting", () => {
  describe("morning", () => {
    it("returns 'Good morning' at midnight", () => {
      expect(getGreeting(0)).toBe("Good morning");
    });

    it("returns 'Good morning' at 6am", () => {
      expect(getGreeting(6)).toBe("Good morning");
    });

    it("returns 'Good morning' at 11am", () => {
      expect(getGreeting(11)).toBe("Good morning");
    });
  });

  describe("afternoon", () => {
    it("returns 'Good afternoon' at noon", () => {
      expect(getGreeting(12)).toBe("Good afternoon");
    });

    it("returns 'Good afternoon' at 3pm", () => {
      expect(getGreeting(15)).toBe("Good afternoon");
    });

    it("returns 'Good afternoon' at 5pm", () => {
      expect(getGreeting(17)).toBe("Good afternoon");
    });
  });

  describe("evening", () => {
    it("returns 'Good evening' at 6pm", () => {
      expect(getGreeting(18)).toBe("Good evening");
    });

    it("returns 'Good evening' at 9pm", () => {
      expect(getGreeting(21)).toBe("Good evening");
    });

    it("returns 'Good evening' at 11pm", () => {
      expect(getGreeting(23)).toBe("Good evening");
    });
  });
});
