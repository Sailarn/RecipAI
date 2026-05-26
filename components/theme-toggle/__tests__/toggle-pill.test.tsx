import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TogglePill } from "../toggle-pill";

describe("TogglePill", () => {
  describe("when unchecked", () => {
    it("sets data-on to false", () => {
      const { container } = render(<TogglePill checked={false} />);
      expect(container.querySelector(".toggle-pill")).toHaveAttribute(
        "data-on",
        "false",
      );
    });

    it("renders the Sun icon", () => {
      const { container } = render(<TogglePill checked={false} />);
      expect(container.querySelector(".lucide-sun")).toBeInTheDocument();
    });
  });

  describe("when checked", () => {
    it("sets data-on to true", () => {
      const { container } = render(<TogglePill checked={true} />);
      expect(container.querySelector(".toggle-pill")).toHaveAttribute(
        "data-on",
        "true",
      );
    });

    it("renders the Moon icon", () => {
      const { container } = render(<TogglePill checked={true} />);
      expect(container.querySelector(".lucide-moon")).toBeInTheDocument();
    });
  });
});
