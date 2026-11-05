// The AI chat apps RecipAI can be connected to as a connector (/api/mcp).
// Client-safe: used by the Ask AI button, the profile rows and the server's
// connections endpoint.

export type AiAppId = "claude" | "chatgpt";

export interface AiApp {
  id: AiAppId;
  label: string;
  /** A new chat with the prompt prefilled (best effort; see askAboutRecipe). */
  newChatUrl: (prompt: string) => string;
  /**
   * Where the user adds a custom connector. Chosen to be a universal link on
   * iOS where one exists, so it opens the native app (signed in) instead of
   * an in-app browser that knows none of the user's accounts.
   */
  connectorSettingsUrl: string;
  /**
   * The app's own directory listing for RecipAI, when it has one: the user
   * taps Connect there instead of adding a custom connector by URL.
   */
  directoryUrl?: string;
}

export const AI_APPS: Record<AiAppId, AiApp> = {
  claude: {
    id: "claude",
    label: "Claude",
    newChatUrl: (prompt) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    // Listed in claude.ai's apple-app-site-association: opens the Claude app
    // straight on "Add custom connector". (/settings/connectors is not, and
    // opened a browser.)
    connectorSettingsUrl:
      "https://claude.ai/customize/connectors?modal=add-custom-connector",
    // Listed in Claude's Connectors Directory. Not a universal link (claude.ai's
    // apple-app-site-association doesn't cover /directory), so on iPhone it
    // opens in the browser; the sheet also says how to find it in the app.
    directoryUrl: "https://claude.ai/directory/connectors/recipai",
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
