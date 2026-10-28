import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import ua from "@/locales/ua.json";
import { PARSE_MESSAGES, parseMessageKey } from "../parse-message-key";

describe("parseMessageKey", () => {
  it("finds the key of a known message", () => {
    expect(parseMessageKey(PARSE_MESSAGES.notRecipe)).toBe("notRecipe");
    expect(parseMessageKey("Photo import")).toBe("photoImport");
  });

  it("returns null for any other text", () => {
    expect(parseMessageKey("Borscht")).toBeNull();
  });
});

describe("parse.messages translations", () => {
  it("match the English source texts word for word", () => {
    expect(en.parse.messages).toEqual(PARSE_MESSAGES);
  });

  it("exist in Ukrainian for every message", () => {
    expect(Object.keys(ua.parse.messages).sort()).toEqual(
      Object.keys(PARSE_MESSAGES).sort(),
    );
  });
});
