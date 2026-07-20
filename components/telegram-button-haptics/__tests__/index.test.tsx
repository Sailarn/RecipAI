import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramButtonHaptics } from "@/components/telegram-button-haptics";

const { platform } = vi.hoisted(() => ({
  platform: {
    kind: "telegram" as "telegram" | "web",
    haptics: { impact: vi.fn(), notify: vi.fn(), selection: vi.fn() },
  },
}));

vi.mock("@/lib/platform", () => ({ usePlatform: () => platform }));

afterEach(() => {
  platform.kind = "telegram";
  vi.clearAllMocks();
});

function pressButton(button: HTMLElement) {
  button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
}

describe("TelegramButtonHaptics", () => {
  it("fires a light haptic on button press in Telegram", () => {
    render(<TelegramButtonHaptics />);
    const button = document.createElement("button");
    document.body.appendChild(button);

    pressButton(button);

    expect(platform.haptics.impact).toHaveBeenCalledWith("light");
    button.remove();
  });

  it("ignores disabled buttons", () => {
    render(<TelegramButtonHaptics />);
    const button = document.createElement("button");
    button.disabled = true;
    document.body.appendChild(button);

    pressButton(button);

    expect(platform.haptics.impact).not.toHaveBeenCalled();
    button.remove();
  });

  it("does nothing on presses outside a button", () => {
    render(<TelegramButtonHaptics />);
    const div = document.createElement("div");
    document.body.appendChild(div);

    pressButton(div);

    expect(platform.haptics.impact).not.toHaveBeenCalled();
    div.remove();
  });

  it("attaches no listener outside Telegram", () => {
    platform.kind = "web";
    render(<TelegramButtonHaptics />);
    const button = document.createElement("button");
    document.body.appendChild(button);

    pressButton(button);

    expect(platform.haptics.impact).not.toHaveBeenCalled();
    button.remove();
  });
});
