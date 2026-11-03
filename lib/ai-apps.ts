// The AI chat apps RecipAI can be connected to as a connector (/api/mcp).
// Client-safe: used by the Ask AI button, the profile rows and the server's
// connections endpoint.

export type AiAppId = "claude" | "chatgpt";

export interface AiApp {
  id: AiAppId;
  label: string;
  /** A new chat with the prompt prefilled (best effort; see askAboutRecipe). */
  newChatUrl: (prompt: string) => string;
  /** Where the user adds a custom connector. */
  connectorSettingsUrl: string;
}

export const AI_APPS: Record<AiAppId, AiApp> = {
  claude: {
    id: "claude",
    label: "Claude",
    newChatUrl: (prompt) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    connectorSettingsUrl: "https://claude.ai/settings/connectors",
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    newChatUrl: (prompt) =>
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
    connectorSettingsUrl: "https://chatgpt.com/",
  },
};

/** Apps offered in the UI, in menu order. */
export const ENABLED_AI_APPS: AiAppId[] = ["claude", "chatgpt"];

/**
 * Which app an OAuth client is, from the name it registered with during
 * dynamic client registration. Null for anything else (e.g. MCP Inspector).
 */
export function aiAppFromClientName(
  name: string | null | undefined,
): AiAppId | null {
  if (!name) return null;
  if (/claude/i.test(name)) return "claude";
  if (/chatgpt|openai/i.test(name)) return "chatgpt";
  return null;
}
