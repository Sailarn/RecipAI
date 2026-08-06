import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackEvent, isStandalonePwa } = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  isStandalonePwa: vi.fn(() => true),
}));

vi.mock("@/lib/telemetry", () => ({ trackEvent }));
vi.mock("@/lib/pwa", () => ({ isStandalonePwa }));

import { reportDisplayScale } from "../display-scale";

/** The real numbers from the reported iPhone: a 393px screen laid out at 462. */
function withDisplay(viewportWidth: number, screenWidth: number) {
  vi.stubGlobal("window", {
    innerWidth: viewportWidth,
    screen: { width: screenWidth },
  });
}

describe("reportDisplayScale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isStandalonePwa.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports the zoom factor when the layout viewport is wider than the screen", () => {
    withDisplay(462, 393);

    reportDisplayScale();

    expect(trackEvent).toHaveBeenCalledWith("display_zoom_detected", {
      zoom: 0.85,
      viewport_width: 462,
      screen_width: 393,
    });
  });

  it("reports zooming in as well as out", () => {
    withDisplay(315, 393);

    reportDisplayScale();

    expect(trackEvent).toHaveBeenCalledWith(
      "display_zoom_detected",
      expect.objectContaining({ zoom: 1.25 }),
    );
  });

  it("stays quiet at 100%", () => {
    withDisplay(393, 393);

    reportDisplayScale();

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("treats a pixel or two of difference as noise, not zoom", () => {
    withDisplay(391, 393);

    reportDisplayScale();

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("does not measure a browser tab, whose window is not the screen", () => {
    isStandalonePwa.mockReturnValue(false);
    withDisplay(462, 393);

    reportDisplayScale();

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("stays quiet when the screen size is unavailable", () => {
    vi.stubGlobal("window", { innerWidth: 462, screen: undefined });

    reportDisplayScale();

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
