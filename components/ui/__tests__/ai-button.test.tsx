import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiButton } from "../ai-button";

describe("AiButton", () => {
  describe("idle", () => {
    it("shows the label and calls onClick", async () => {
      const onClick = vi.fn();
      render(<AiButton onClick={onClick} label="Analyze" />);

      await userEvent.click(screen.getByRole("button", { name: /Analyze/ }));

      expect(onClick).toHaveBeenCalledOnce();
    });

    it("falls back to the default label", () => {
      render(<AiButton onClick={vi.fn()} />);

      expect(screen.getByRole("button")).toHaveTextContent("Import with AI");
    });
  });

  describe("disabled", () => {
    it("ignores clicks and marks itself inactive", async () => {
      const onClick = vi.fn();
      render(<AiButton onClick={onClick} disabled />);
      const button = screen.getByRole("button");

      await userEvent.click(button);

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("data-active", "false");
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("loading", () => {
    it("shows the loading label, disables the button and hides the label", () => {
      render(
        <AiButton
          onClick={vi.fn()}
          loading
          label="Analyze"
          loadingLabel="Working"
        />,
      );
      const button = screen.getByRole("button");

      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("Working");
      expect(button).not.toHaveTextContent("Analyze");
      expect(button).toHaveAttribute("data-active", "false");
    });
  });

  it("marks an idle enabled button active", () => {
    render(<AiButton onClick={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveAttribute("data-active", "true");
  });
});
