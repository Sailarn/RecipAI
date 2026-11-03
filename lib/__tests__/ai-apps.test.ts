import { describe, expect, it } from "vitest";
import { AI_APPS, aiAppFromClientName } from "../ai-apps";

describe("aiAppFromClientName", () => {
  it("recognises Claude and ChatGPT clients by their registered names", () => {
    expect(aiAppFromClientName("Claude")).toBe("claude");
    expect(aiAppFromClientName("claude-desktop")).toBe("claude");
    expect(aiAppFromClientName("ChatGPT")).toBe("chatgpt");
    expect(aiAppFromClientName("OpenAI Connector")).toBe("chatgpt");
  });

  it("returns null for other clients", () => {
    expect(aiAppFromClientName("MCP Inspector")).toBeNull();
    expect(aiAppFromClientName(undefined)).toBeNull();
  });
});

describe("AI_APPS.newChatUrl", () => {
  it("encodes the prompt into the new-chat link", () => {
    expect(AI_APPS.claude.newChatUrl("Borscht & co?")).toBe(
      "https://claude.ai/new?q=Borscht%20%26%20co%3F",
    );
    expect(AI_APPS.chatgpt.newChatUrl("hi")).toBe("https://chatgpt.com/?q=hi");
  });
});
