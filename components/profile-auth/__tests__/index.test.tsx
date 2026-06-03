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

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    linkSocial: vi.fn().mockResolvedValue(undefined),
    passkey: { addPasskey: vi.fn().mockResolvedValue(undefined) },
  },
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
  }),
}));

vi.mock("../linked-accounts", () => ({
  LinkedAccounts: () => <div data-testid="linked-accounts" />,
}));

vi.mock("@/components/login-view", () => ({
  LoginView: () => null,
}));

import { authClient } from "@/lib/auth-client";
import { routes } from "@/lib/routes";
import { ProfileAuth } from "../index";

const sessionUser = {
  name: "Jane Doe",
  email: "jane@example.com",
  image: null,
};

beforeEach(() => {
  vi.clearAllMocks();
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
        screen.queryByRole("button", { name: /sign out/i }),
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
        screen.getByRole("button", { name: /sign out/i }),
      ).toBeInTheDocument();
    });

    it("renders linked-accounts panel", () => {
      render(<ProfileAuth />);
      expect(screen.getByTestId("linked-accounts")).toBeInTheDocument();
    });

    it("calls signOut and router.refresh on sign-out click", async () => {
      render(<ProfileAuth />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
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
