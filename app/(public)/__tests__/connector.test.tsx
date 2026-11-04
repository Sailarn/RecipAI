/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConnectorDocsPage from "../connector/page";

describe("connector docs", () => {
  it("documents setup, every tool, three example prompts and support", () => {
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL =
      "https://recip-ai-wine.vercel.app";
    render(<ConnectorDocsPage />);

    expect(
      screen.getByText("https://recip-ai-wine.vercel.app/api/mcp"),
    ).toBeInTheDocument();
    for (const tool of [
      "search",
      "fetch",
      "create_recipe",
      "update_recipe",
      "delete_recipe",
      "import_recipe",
      "get_import_status",
      "list_collections",
      "create_collection",
      "add_to_collection",
      "remove_from_collection",
    ]) {
      expect(screen.getByText(tool)).toBeInTheDocument();
    }
    const examples = screen
      .getByRole("heading", { name: "Example prompts" })
      .parentElement?.querySelectorAll("ol > li");
    expect(examples).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });
});
