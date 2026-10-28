import { describe, expect, it } from "vitest";
import uk from "@/locales/uk.json";
import { parseDonePush, parseFailedPush, requestLocale } from "../parse-push";

function requestWithCookie(cookie?: string) {
  return new Request("http://localhost/api/parse-queue/process", {
    headers: cookie ? { cookie } : {},
  });
}

describe("requestLocale", () => {
  it("reads the next-intl locale cookie", () => {
    expect(requestLocale(requestWithCookie("theme=dark; NEXT_LOCALE=en"))).toBe(
      "en",
    );
  });

  it("reads the old ua cookie as Ukrainian", () => {
    expect(requestLocale(requestWithCookie("NEXT_LOCALE=ua"))).toBe("uk");
  });

  it("falls back to the default without a usable cookie", () => {
    expect(requestLocale(requestWithCookie())).toBe("uk");
    expect(requestLocale(requestWithCookie("NEXT_LOCALE=de"))).toBe("uk");
  });
});

describe("parseDonePush", () => {
  it("tells a signed-in user the recipe is saved, in their language", () => {
    expect(
      parseDonePush({
        locale: "uk",
        title: "Борщ",
        savedToLibrary: true,
        url: "/",
      }),
    ).toEqual({
      title: "Борщ",
      body: "Збережено у ваші рецепти — натисніть, щоб відкрити",
      url: "/",
    });
  });

  it("tells an anonymous user the recipe is ready", () => {
    expect(
      parseDonePush({
        locale: "en",
        title: "Soup",
        savedToLibrary: false,
        url: "/",
      }).body,
    ).toBe("Your recipe is ready — tap to open");
  });
});

describe("parseFailedPush", () => {
  it("translates a known failure", () => {
    const payload = parseFailedPush({
      locale: "uk",
      error: new Error("This post is private"),
      url: "/",
    });

    expect(payload).toEqual({
      title: "Не вдалося розпізнати рецепт",
      body: uk.parse.messages.private,
      url: "/",
    });
  });

  it("uses a generic message for an unknown failure instead of the raw error", () => {
    expect(
      parseFailedPush({
        locale: "en",
        error: new Error("ECONNRESET at socket 42"),
        url: "/",
      }).body,
    ).toBe("Couldn't get a recipe from that link. Try again.");
  });
});
