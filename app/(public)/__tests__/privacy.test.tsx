/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "../privacy/page";

describe("privacy policy", () => {
  it("covers what directory reviewers check: collection, use, processors, AI access, retention, deletion, contact", () => {
    render(<PrivacyPage />);
    for (const heading of [
      "What we collect",
      "Why we use it",
      "Who processes it",
      "AI assistants (Claude, ChatGPT)",
      "How long we keep it",
      "Deleting your data",
      "Contact",
    ]) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("link", { name: "denis9524@gmail.com" })[0],
    ).toHaveAttribute("href", "mailto:denis9524@gmail.com");
  });
});
