import { render } from "@testing-library/react";
import { Bell, BellOff } from "lucide-react";
import { describe, expect, it } from "vitest";
import { TogglePill } from "../index";

describe("TogglePill", () => {
  describe("when unchecked", () => {
    it("renders the off icon", () => {
      const { container } = render(
        <TogglePill checked={false} offIcon={BellOff} onIcon={Bell} />,
      );

      expect(container.querySelector(".toggle-pill")).toHaveAttribute(
        "data-on",
        "false",
      );
      expect(container.querySelector(".lucide-bell-off")).toBeInTheDocument();
    });
  });

  describe("when checked", () => {
    it("renders the on icon", () => {
      const { container } = render(
        <TogglePill checked offIcon={BellOff} onIcon={Bell} />,
      );

      expect(container.querySelector(".toggle-pill")).toHaveAttribute(
        "data-on",
        "true",
      );
      expect(container.querySelector(".lucide-bell")).toBeInTheDocument();
    });
  });
});
