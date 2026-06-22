import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBarScrim } from "../index";

describe("StatusBarScrim", () => {
  it("uses the shared full-screen background geometry", () => {
    render(<StatusBarScrim />);

    expect(screen.getByTestId("status-bar-scrim")).toHaveClass(
      "app-full-bleed-background",
      "status-bar-scrim",
    );
  });
});
