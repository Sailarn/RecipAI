import { describe, expect, it } from "vitest";
import { miniAppDataToUser } from "../telegram-user";

describe("miniAppDataToUser", () => {
  it("synthesizes a placeholder email keyed by the Telegram id", () => {
    const result = miniAppDataToUser({ id: 12345, first_name: "Olena" });

    expect(result.email).toBe("12345@telegram.miniapp");
  });

  it("always returns a non-empty email so the NOT NULL user column is satisfied", () => {
    const result = miniAppDataToUser({ id: 999, first_name: "Ivan" });

    expect(result.email).toBeTruthy();
  });

  it("joins first and last name", () => {
    const result = miniAppDataToUser({
      id: 1,
      first_name: "Olena",
      last_name: "Koval",
    });

    expect(result.name).toBe("Olena Koval");
  });

  it("uses the first name alone when there is no last name", () => {
    const result = miniAppDataToUser({ id: 1, first_name: "Olena" });

    expect(result.name).toBe("Olena");
  });

  it("passes through the photo url as the image", () => {
    const result = miniAppDataToUser({
      id: 1,
      first_name: "Olena",
      photo_url: "https://example.com/a.jpg",
    });

    expect(result.image).toBe("https://example.com/a.jpg");
  });

  it("gives distinct users distinct emails", () => {
    const first = miniAppDataToUser({ id: 1, first_name: "A" });
    const second = miniAppDataToUser({ id: 2, first_name: "B" });

    expect(first.email).not.toBe(second.email);
  });
});
