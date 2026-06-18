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

  it("is present in the server-rendered document", () => {
    const markup = renderToString(<LaunchSplash />);

    expect(markup).toContain("data-launch-splash");
  });

  it("is removed after its display duration in a browser tab", () => {
    const { container } = render(<LaunchSplash />);

    act(() => vi.advanceTimersByTime(1000));

    expect(container.querySelector("[data-launch-splash]")).toBeNull();
  });
});
