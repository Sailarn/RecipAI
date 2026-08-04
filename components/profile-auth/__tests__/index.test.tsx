/**
 * @vitest-environment happy-dom
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRefresh = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockRefreshLinkedAccounts = vi.hoisted(() => vi.fn());
const isStandalonePwa = vi.hoisted(() => vi.fn(() => false));
const isIos = vi.hoisted(() => vi.fn(() => false));
const copyAndOpenExternalAuthUrl = vi.hoisted(() => vi.fn());
const canShareExternalAuthUrl = vi.hoisted(() => vi.fn(() => false));
const shareExternalAuthUrl = vi.hoisted(() => vi.fn());
const copyExternalAuthUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    linkSocial: vi.fn().mockResolvedValue(undefined),
    externalLink: { generate: vi.fn() },
    passkey: { addPasskey: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock("@/lib/pwa", () => ({ isStandalonePwa, isIos }));

vi.mock("@/lib/auth/external-browser", () => ({
  copyAndOpenExternalAuthUrl,
  canShareExternalAuthUrl,
  shareExternalAuthUrl,
  copyExternalAuthUrl,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../use-linked-accounts", () => ({
  useLinkedAccounts: vi.fn().mockReturnValue({
    linkedProviders: [],
    telegramLinked: false,
    passkeyAdded: false,
    isLoading: false,
    refreshLinkedAccounts: mockRefreshLinkedAccounts,
  }),
}));

vi.mock("../linked-accounts", () => ({
  LinkedAccounts: ({ onLinkGoogle }: { onLinkGoogle: () => void }) => (
    <div data-testid="linked-accounts">
      <button type="button" onClick={onLinkGoogle}>
        Link Google test
      </button>
    </div>
  ),
}));

vi.mock("@/components/login-view", () => ({
  LoginView: () => null,
}));

const telegramState = vi.hoisted(() => ({ authStatus: "idle" as string }));
const inTelegram = vi.hoisted(() => ({ value: false }));
vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => ({ authStatus: telegramState.authStatus }),
}));
vi.mock("@/lib/telegram/webapp", () => ({
  isTelegramEnvironment: () => inTelegram.value,
}));

const platform = vi.hoisted(() => ({
  features: { accountLinking: true, accountActions: true } as Record<
    string,
    boolean
  >,
}));
vi.mock("@/lib/platform", () => ({
  Capability: ({
    name,
    children,
  }: {
    name: string;
    children: React.ReactNode;
  }) => (platform.features[name] ? children : null),
  useFeature: (name: string) => platform.features[name] ?? false,
}));

import { authClient } from "@/lib/auth/auth-client";
import { routes } from "@/lib/routes";
import { ProfileAuth } from "../index";

const sessionUser = {
  name: "Jane Doe",
  email: "jane@example.com",
  image: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  isStandalonePwa.mockReturnValue(false);
  platform.features.accountLinking = true;
  platform.features.accountActions = true;
  telegramState.authStatus = "idle";
  inTelegram.value = false;
  process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL = "https://auth.example";
});

describe("ProfileAuth", () => {
  describe("loading state", () => {
    it("shows no action buttons while session is pending", () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
        isPending: true,
      } as never);

      render(<ProfileAuth />);

      expect(
        screen.queryByRole("button", { name: /sign in/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "signOut" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("signed-out state", () => {
    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
        isPending: false,
      } as never);
    });

    it("shows sign-in button", () => {
      render(<ProfileAuth />);
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    it("pushes login route when sign-in is clicked", () => {
      render(<ProfileAuth />);
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
      expect(mockPush).toHaveBeenCalledWith(
        routes.login("en"),
        expect.anything(),
      );
    });
  });

  describe("telegram auto sign-in", () => {
    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
        isPending: false,
      } as never);
      inTelegram.value = true;
    });

    it("holds the skeleton, not the sign-in prompt, while auto sign-in is pending", () => {
      telegramState.authStatus = "pending";

      render(<ProfileAuth />);

      expect(
        screen.queryByRole("button", { name: /sign in/i }),
      ).not.toBeInTheDocument();
    });

    it("holds the skeleton before auto sign-in has started (idle)", () => {
      telegramState.authStatus = "idle";

      render(<ProfileAuth />);

      expect(
        screen.queryByRole("button", { name: /sign in/i }),
      ).not.toBeInTheDocument();
    });

    it("shows the sign-in prompt once auto sign-in has failed", () => {
      telegramState.authStatus = "failed";

      render(<ProfileAuth />);

      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });
  });

  describe("signed-in state", () => {
    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: sessionUser },
        isPending: false,
      } as never);
    });

    it("shows user name and email", () => {
      render(<ProfileAuth />);
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("shows sign-out button", () => {
      render(<ProfileAuth />);
      expect(
        screen.getByRole("button", { name: "signOut" }),
      ).toBeInTheDocument();
    });

    it("hides sign-out where account actions are unavailable", () => {
      platform.features.accountActions = false;

      render(<ProfileAuth />);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "signOut" }),
      ).not.toBeInTheDocument();
    });

    it("renders linked-accounts panel", () => {
      render(<ProfileAuth />);
      expect(screen.getByTestId("linked-accounts")).toBeInTheDocument();
    });

    it("hides the linked-accounts panel when linking is unavailable", () => {
      platform.features.accountLinking = false;

      render(<ProfileAuth />);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.queryByTestId("linked-accounts")).not.toBeInTheDocument();
    });

    it("keeps normal Google linking in a browser tab", async () => {
      render(<ProfileAuth />);

      fireEvent.click(screen.getByRole("button", { name: "Link Google test" }));

      await waitFor(() => {
        expect(authClient.linkSocial).toHaveBeenCalledWith({
          provider: "google",
          callbackURL: "/en/profile",
        });
      });
      expect(authClient.externalLink.generate).not.toHaveBeenCalled();
    });

    it("puts the standalone handoff token only in the URL fragment", async () => {
      isStandalonePwa.mockReturnValue(true);
      vi.mocked(authClient.externalLink.generate).mockResolvedValue({
        data: { token: "one-time-token" },
        error: null,
      } as never);
      render(<ProfileAuth />);

      fireEvent.click(screen.getByRole("button", { name: "Link Google test" }));

      await screen.findByText("waitingForGoogle");
      fireEvent.click(screen.getByRole("button", { name: "openInBrowser" }));
      expect(copyAndOpenExternalAuthUrl).toHaveBeenCalledWith(
        "https://auth.example/external-auth/link?locale=en#token=one-time-token",
      );
    });

    it("shows a wait hint when handoff generation is rate limited", async () => {
      isStandalonePwa.mockReturnValue(true);
      vi.mocked(authClient.externalLink.generate).mockResolvedValue({
        data: null,
        error: { status: 429 },
      } as never);
      render(<ProfileAuth />);

      fireEvent.click(screen.getByRole("button", { name: "Link Google test" }));

      expect(
        await screen.findByText(/wait a minute and try again/i),
      ).toBeVisible();
      expect(screen.queryByText("waitingForGoogle")).not.toBeInTheDocument();
    });

    it("surfaces the failure status when handoff generation returns no token", async () => {
      isStandalonePwa.mockReturnValue(true);
      vi.mocked(authClient.externalLink.generate).mockResolvedValue({
        data: null,
        error: { status: 401 },
      } as never);
      render(<ProfileAuth />);

      fireEvent.click(screen.getByRole("button", { name: "Link Google test" }));

      expect(await screen.findByText(/error 401/i)).toBeVisible();
    });

    it("calls signOut and router.refresh on sign-out click", async () => {
      render(<ProfileAuth />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "signOut" }));
      });

      await waitFor(() => {
        expect(authClient.signOut).toHaveBeenCalledOnce();
        expect(mockRefresh).toHaveBeenCalledOnce();
      });
    });

    it("shows initial avatar when user has no image", () => {
      render(<ProfileAuth />);
      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("shows avatar img when user has image", () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: {
          user: { ...sessionUser, image: "https://example.com/avatar.jpg" },
        },
        isPending: false,
      } as never);

      render(<ProfileAuth />);
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });
});
