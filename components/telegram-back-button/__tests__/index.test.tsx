import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramBackButton } from "@/components/telegram-back-button";
import type { TelegramWebApp } from "@/lib/telegram/webapp";

const { telegramState, navigateBack, stackState } = vi.hoisted(() => ({
  telegramState: { webApp: undefined as TelegramWebApp | undefined },
  navigateBack: vi.fn(),
  stackState: { canPop: false },
}));

vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => telegramState,
}));
vi.mock("@/lib/navigation-stack", () => ({
  useNavigationStack: () => stackState,
}));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: navigateBack, replace: vi.fn() }),
}));

function backButtonSpy() {
  return {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn(),
    offClick: vi.fn(),
  };
}

afterEach(() => {
  telegramState.webApp = undefined;
  stackState.canPop = false;
  vi.clearAllMocks();
});

describe("TelegramBackButton", () => {
  it("does nothing outside Telegram", () => {
    telegramState.webApp = undefined;

    expect(() => render(<TelegramBackButton />)).not.toThrow();
  });

  it("shows the back button and wires the handler when a view is pushed", () => {
    const backButton = backButtonSpy();
    telegramState.webApp = {
      BackButton: backButton,
    } as unknown as TelegramWebApp;
    stackState.canPop = true;

    render(<TelegramBackButton />);

    expect(backButton.show).toHaveBeenCalledOnce();
    expect(backButton.hide).not.toHaveBeenCalled();
    const handler = backButton.onClick.mock.calls[0][0];
    handler();
    expect(navigateBack).toHaveBeenCalledOnce();
  });

  it("hides the back button at the root", () => {
    const backButton = backButtonSpy();
    telegramState.webApp = {
      BackButton: backButton,
    } as unknown as TelegramWebApp;
    stackState.canPop = false;

    render(<TelegramBackButton />);

    expect(backButton.hide).toHaveBeenCalledOnce();
    expect(backButton.show).not.toHaveBeenCalled();
  });

  it("unregisters the handler on unmount", () => {
    const backButton = backButtonSpy();
    telegramState.webApp = {
      BackButton: backButton,
    } as unknown as TelegramWebApp;
    stackState.canPop = true;

    const { unmount } = render(<TelegramBackButton />);
    unmount();

    expect(backButton.offClick).toHaveBeenCalledOnce();
  });
});
