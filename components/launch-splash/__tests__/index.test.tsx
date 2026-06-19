/**
 * @vitest-environment happy-dom
 */

import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchSplash } from "../index";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

describe("LaunchSplash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not server-rendered (kept out of the SSR HTML to avoid a hydration mismatch)", () => {
    const markup = renderToString(<LaunchSplash />);

    expect(markup).not.toContain("data-launch-splash");
  });

  it("shows on mount then auto-hides after its duration in a browser tab", () => {
    const { container } = render(<LaunchSplash />);

    expect(container.querySelector("[data-launch-splash]")).not.toBeNull();

    act(() => vi.advanceTimersByTime(1000));

    expect(container.querySelector("[data-launch-splash]")).toBeNull();
  });
});
