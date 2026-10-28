// The popover is `fixed`, so it is placed in viewport coordinates from the
// share button's on-screen rect. Fixed offsets from the window's corner only
// lined up on a phone; on desktop the app column is narrower than the window
// and the popover landed in the window's top-right corner, away from the
// button.

const VIEWPORT_GUTTER = 14;
const MAX_POPOVER_WIDTH = 380;
// Where the arrow's centre sits from the popover's right edge when nothing is
// clamped — the phone layout this popover was designed for.
const ARROW_INSET = 110;
const ARROW_HALF = 7;
const GAP_BELOW_TRIGGER = 13;

export interface TriggerRect {
  left: number;
  width: number;
  bottom: number;
}

export interface PopoverPosition {
  top: number;
  right: number;
  width: number;
  /** The arrow's right offset inside the popover. */
  arrowRight: number;
}

export function sharePopoverPosition(
  trigger: TriggerRect,
  viewportWidth: number,
): PopoverPosition {
  const width = Math.min(
    MAX_POPOVER_WIDTH,
    viewportWidth - 2 * VIEWPORT_GUTTER,
  );
  const triggerCenterFromRight =
    viewportWidth - (trigger.left + trigger.width / 2);
  const right = Math.min(
    Math.max(VIEWPORT_GUTTER, triggerCenterFromRight - ARROW_INSET),
    viewportWidth - VIEWPORT_GUTTER - width,
  );
  return {
    top: trigger.bottom + GAP_BELOW_TRIGGER,
    right,
    width,
    arrowRight: triggerCenterFromRight - right - ARROW_HALF,
  };
}
