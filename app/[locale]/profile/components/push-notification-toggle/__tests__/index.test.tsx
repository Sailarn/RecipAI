import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import { PushNotificationToggle } from "../index";

vi.mock("@/lib/hooks/use-push-subscription", () => ({
  usePushSubscription: vi.fn(),
}));

const { pushFeature } = vi.hoisted(() => ({ pushFeature: { value: true } }));
vi.mock("@/lib/platform", () => ({
  useFeature: () => pushFeature.value,
}));

type PushState = ReturnType<typeof usePushSubscription>;

function mockPush(overrides: Partial<PushState>): void {
  vi.mocked(usePushSubscription).mockReturnValue({
    isSupported: true,
    isPending: false,
    permission: "default",
    subscription: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    ...overrides,
  });
}

afterEach(() => {
  pushFeature.value = true;
  vi.clearAllMocks();
});

describe("PushNotificationToggle", () => {
  it("renders nothing when the push feature is unavailable", () => {
    pushFeature.value = false;
    mockPush({ isSupported: true });

    const { container } = render(<PushNotificationToggle />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when push is unsupported", () => {
    mockPush({ isSupported: false });

    const { container } = render(<PushNotificationToggle />);

    expect(container).toBeEmptyDOMElement();
  });

  it("exposes a switch that is unchecked without a subscription", () => {
    mockPush({ subscription: null });

    const { container } = render(<PushNotificationToggle />);

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(
      container.querySelector(".toggle-pill .lucide-bell-off"),
    ).toBeInTheDocument();
  });

  it("marks the switch checked when subscribed", () => {
    mockPush({ subscription: {} as PushSubscription });

    const { container } = render(<PushNotificationToggle />);

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(
      container.querySelector(".toggle-pill .lucide-bell"),
    ).toBeInTheDocument();
  });

  it("disables the switch while an operation is pending", () => {
    mockPush({ isPending: true });

    render(<PushNotificationToggle />);

    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("shows a settings hint instead of a switch when permission is denied", () => {
    mockPush({ permission: "denied" });

    render(<PushNotificationToggle />);

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("enableInSettings")).toBeInTheDocument();
  });
});
