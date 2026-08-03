/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParseForm } from "../index";

const { useClipboardLink } = vi.hoisted(() => ({
  useClipboardLink: vi.fn(),
}));

vi.mock("@/lib/hooks/use-clipboard-link", () => ({ useClipboardLink }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

interface RenderOptions {
  url?: string;
  loading?: boolean;
  canPaste?: boolean;
  suggestion?: string | null;
  pastedLink?: string | null;
}

function renderForm(options: RenderOptions = {}) {
  const {
    url = "",
    loading = false,
    canPaste = true,
    suggestion = null,
    pastedLink = null,
  } = options;

  const pasteLink = vi.fn().mockResolvedValue(pastedLink);
  const dismissSuggestion = vi.fn();
  useClipboardLink.mockReturnValue({
    canPaste,
    isReading: false,
    pasteLink,
    suggestion,
    dismissSuggestion,
  });

  const onUrlChange = vi.fn();
  const onSubmit = vi.fn();

  render(
    <ParseForm
      url={url}
      onUrlChange={onUrlChange}
      loading={loading}
      error={null}
      onSubmit={onSubmit}
    />,
  );

  return { onUrlChange, onSubmit, pasteLink, dismissSuggestion };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ParseForm", () => {
  describe("paste action", () => {
    it("fills the field with the link from the clipboard", async () => {
      const { onUrlChange, pasteLink } = renderForm({
        pastedLink: "https://silpo.ua/recipes/borscht",
      });

      await userEvent.click(screen.getByRole("button", { name: "paste" }));

      expect(pasteLink).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(onUrlChange).toHaveBeenCalledWith(
          "https://silpo.ua/recipes/borscht",
        ),
      );
    });

    it("explains itself when the clipboard holds no link", async () => {
      const { onUrlChange } = renderForm({ pastedLink: null });

      await userEvent.click(screen.getByRole("button", { name: "paste" }));

      expect(await screen.findByText("pasteEmpty")).toBeInTheDocument();
      expect(onUrlChange).not.toHaveBeenCalled();
    });

    it("hides the paste button when the clipboard cannot be read", () => {
      renderForm({ canPaste: false });

      expect(
        screen.queryByRole("button", { name: "paste" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("clear action", () => {
    it("replaces paste with clear once the field has a value", () => {
      renderForm({ url: "https://silpo.ua/recipes/borscht" });

      expect(screen.getByRole("button", { name: "clear" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "paste" }),
      ).not.toBeInTheDocument();
    });

    it("empties the field", async () => {
      const { onUrlChange } = renderForm({
        url: "https://silpo.ua/recipes/borscht",
      });

      await userEvent.click(screen.getByRole("button", { name: "clear" }));

      expect(onUrlChange).toHaveBeenCalledWith("");
    });

    it("is absent while the field is empty", () => {
      renderForm({ url: "" });

      expect(
        screen.queryByRole("button", { name: "clear" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("clipboard suggestion", () => {
    it("adopts the suggested link when tapped", async () => {
      const { onUrlChange, dismissSuggestion } = renderForm({
        suggestion: "https://silpo.ua/recipes/borscht",
      });

      await userEvent.click(screen.getByRole("button", { name: /silpo\.ua/ }));

      expect(onUrlChange).toHaveBeenCalledWith(
        "https://silpo.ua/recipes/borscht",
      );
      expect(dismissSuggestion).toHaveBeenCalledOnce();
    });

    it("dismisses without filling the field", async () => {
      const { onUrlChange, dismissSuggestion } = renderForm({
        suggestion: "https://silpo.ua/recipes/borscht",
      });

      await userEvent.click(
        screen.getByRole("button", { name: "dismissSuggestion" }),
      );

      expect(dismissSuggestion).toHaveBeenCalledOnce();
      expect(onUrlChange).not.toHaveBeenCalled();
    });

    it("is hidden while a parse is running", () => {
      renderForm({
        suggestion: "https://silpo.ua/recipes/borscht",
        loading: true,
      });

      expect(screen.queryByText("suggestion")).not.toBeInTheDocument();
    });
  });
});
