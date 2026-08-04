/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useTelegramNotify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/hooks/use-telegram-notify", () => ({ useTelegramNotify }));

import { TelegramNotifyToggle } from "../index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TelegramNotifyToggle", () => {
  it("renders nothing when the user has no Telegram connection", () => {
    useTelegramNotify.mockReturnValue({
      available: false,
      enabled: true,
      setEnabled: vi.fn(),
    });

    const { container } = render(<TelegramNotifyToggle />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders an on switch when available and enabled", () => {
    useTelegramNotify.mockReturnValue({
      available: true,
      enabled: true,
      setEnabled: vi.fn(),
    });

    render(<TelegramNotifyToggle />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("telegramNotifications")).toBeInTheDocument();
  });

  it("toggles the preference off when clicked while enabled", () => {
    const setEnabled = vi.fn();
    useTelegramNotify.mockReturnValue({
      available: true,
      enabled: true,
      setEnabled,
    });

    render(<TelegramNotifyToggle />);
    fireEvent.click(screen.getByRole("switch"));

    expect(setEnabled).toHaveBeenCalledWith(false);
  });
});
