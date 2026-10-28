import { describe, expect, it } from "vitest";
import { sharePopoverPosition } from "../popover-position";

// A 32px share button whose centre sits 124px from the right edge.
function triggerCenteredFromRight(viewportWidth: number, fromRight: number) {
  return { left: viewportWidth - fromRight - 16, width: 32, bottom: 51 };
}

describe("sharePopoverPosition", () => {
  it("keeps the phone layout: right-aligned with the arrow under the button", () => {
    const position = sharePopoverPosition(
      triggerCenteredFromRight(390, 124),
      390,
    );

    expect(position).toEqual({
      top: 64,
      right: 14,
      width: 362,
      arrowRight: 103,
    });
  });

  it("follows the button on a wide window instead of the window corner", () => {
    const position = sharePopoverPosition(
      triggerCenteredFromRight(1440, 508),
      1440,
    );

    expect(position.right).toBe(398);
    expect(position.width).toBe(380);
    expect(position.arrowRight).toBe(103);
  });

  it("stays inside the window and moves the arrow when the button is near the edge", () => {
    const position = sharePopoverPosition(
      triggerCenteredFromRight(390, 40),
      390,
    );

    expect(position.right).toBe(14);
    expect(position.arrowRight).toBe(19);
  });

  it("never lets the popover run off the left edge", () => {
    const position = sharePopoverPosition(
      triggerCenteredFromRight(1440, 1420),
      1440,
    );

    expect(position.right + position.width).toBeLessThanOrEqual(1440 - 14);
  });
});
