import { describe, expect, it } from "vitest";
import { PARSE_TEXT_PROMPT, parseTextRequest } from "../parse-text-command";

describe("parseTextRequest", () => {
  describe("the /parse_text command", () => {
    it("asks for the text when the command comes alone", () => {
      expect(parseTextRequest({ text: "/parse_text" })).toEqual({
        kind: "ask-for-text",
      });
    });

    it("parses the text that follows the command, across lines", () => {
      const request = parseTextRequest({
        text: "/parse_text Pancakes\n200 g flour\nFry.",
      });

      expect(request).toEqual({
        kind: "parse",
        text: "Pancakes\n200 g flour\nFry.",
      });
    });

    it("accepts the @botname form Telegram uses in groups", () => {
      expect(parseTextRequest({ text: "/parse_text@recipai_bot" })).toEqual({
        kind: "ask-for-text",
      });
    });

    it("does not match a longer command that merely starts the same way", () => {
      expect(parseTextRequest({ text: "/parse_textual" })).toBeNull();
    });
  });

  describe("replies to the prompt", () => {
    it("parses a reply to the bot's prompt", () => {
      const request = parseTextRequest({
        text: "Pancakes: flour, eggs. Whisk and fry.",
        reply_to_message: { text: PARSE_TEXT_PROMPT, from: { is_bot: true } },
      });

      expect(request).toEqual({
        kind: "parse",
        text: "Pancakes: flour, eggs. Whisk and fry.",
      });
    });

    it("ignores replies to any other message", () => {
      const request = parseTextRequest({
        text: "Pancakes: flour, eggs.",
        reply_to_message: { text: "something else", from: { is_bot: true } },
      });

      expect(request).toBeNull();
    });
  });

  describe("plain messages", () => {
    it("never treats free text as a recipe on its own", () => {
      expect(
        parseTextRequest({ text: "Pancakes: 200 g flour, 2 eggs. Fry." }),
      ).toBeNull();
    });
  });
});
