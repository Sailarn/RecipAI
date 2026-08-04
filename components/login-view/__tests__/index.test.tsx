/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/telemetry";
import { LoginView } from "../index";

const isStandalonePwa = vi.hoisted(() => vi.fn(() => false));
const isIos = vi.hoisted(() => vi.fn(() => false));
const requestDeviceAuthorization = vi.hoisted(() => vi.fn());
const pollDeviceAuthorization = vi.hoisted(() => vi.fn());
const copyAndOpenExternalAuthUrl = vi.hoisted(() => vi.fn());
const canShareExternalAuthUrl = vi.hoisted(() => vi.fn(() => false));
const shareExternalAuthUrl = vi.hoisted(() => vi.fn());
const copyExternalAuthUrl = vi.hoisted(() => vi.fn());
const completeDeviceSignIn = vi.hoisted(() => vi.fn());
const establishDeviceSession = vi.hoisted(() => vi.fn());
const navigatePush = vi.hoisted(() => vi.fn());
const savePendingDeviceAuth = vi.hoisted(() => vi.fn());
const loadPendingDeviceAuth = vi.hoisted(() =>
  vi.fn<() => unknown>(() => null),
);
const clearPendingDeviceAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn().mockResolvedValue(undefined),
      passkey: vi.fn().mockResolvedValue({ error: null }),
    },
    signInWithTelegramOIDC: vi.fn().mockResolvedValue(undefined),
    signInWithMiniApp: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/pwa", () => ({ isStandalonePwa, isIos }));

vi.mock("@/lib/auth/external-auth-flow", () => ({
  requestDeviceAuthorization,
  pollDeviceAuthorization,
  establishDeviceSession,
  toDeviceAuthClient: (client: unknown) => client,
  toDeviceSessionClient: (client: unknown) => client,
}));

vi.mock("@/lib/auth/external-browser", () => ({
  copyAndOpenExternalAuthUrl,
  canShareExternalAuthUrl,
  shareExternalAuthUrl,
  copyExternalAuthUrl,
  completeDeviceSignIn,
}));

vi.mock("@/lib/auth/pending-device-auth", () => ({
  savePendingDeviceAuth,
  loadPendingDeviceAuth,
  clearPendingDeviceAuth,
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: navigatePush }),
}));

const telegramState = vi.hoisted(() => ({
  isTelegram: false,
  authStatus: "pending" as string,
  webApp: undefined as { initData: string } | undefined,
  user: undefined,
}));

vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => telegramState,
}));

const signInFeature = vi.hoisted(() => ({ value: true }));
vi.mock("@/lib/platform", () => ({
  useFeature: () => signInFeature.value,
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...rest} />,
}));

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isStandalonePwa.mockReturnValue(false);
    loadPendingDeviceAuth.mockReturnValue(null);
    signInFeature.value = true;
    telegramState.authStatus = "pending";
    telegramState.webApp = undefined;
  });

  it("renders the Google sign-in button", () => {
    render(<LoginView locale="en" />);
    expect(screen.getByText("continueGoogle")).toBeInTheDocument();
  });

  it("hides the OAuth options and shows a status inside Telegram", () => {
    signInFeature.value = false;

    render(<LoginView locale="en" />);

    expect(screen.queryByText("continueGoogle")).not.toBeInTheDocument();
    expect(screen.queryByText("continueTelegram")).not.toBeInTheDocument();
    expect(screen.getByText("autoSigningIn")).toBeInTheDocument();
  });

  it("shows a retry hint when Telegram auto sign-in failed", () => {
    signInFeature.value = false;
    telegramState.authStatus = "failed";

    render(<LoginView locale="en" />);

    expect(screen.getByText("autoSignInFailed")).toBeInTheDocument();
  });

  it("retries the Mini App sign-in when the failed-state button is tapped", async () => {
    const { authClient } = await import("@/lib/auth/auth-client");
    signInFeature.value = false;
    telegramState.authStatus = "failed";
    telegramState.webApp = { initData: "signed-init-data" };

    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: "tryAgain" }));

    await waitFor(() => {
      expect(authClient.signInWithMiniApp).toHaveBeenCalledWith(
        "signed-init-data",
      );
    });
    expect(trackEvent).toHaveBeenCalledWith("login", { method: "telegram" });
  });

  it("does not render a retry button when there is no Telegram webApp", () => {
    signInFeature.value = false;
    telegramState.authStatus = "failed";
    telegramState.webApp = undefined;

    render(<LoginView locale="en" />);

    expect(
      screen.queryByRole("button", { name: "tryAgain" }),
    ).not.toBeInTheDocument();
  });

  it("tracks login when signing in with Google", async () => {
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("continueGoogle"));

    expect(trackEvent).toHaveBeenCalledWith("login", { method: "google" });
  });

  it("keeps the standard Google redirect in a browser tab", async () => {
    const { authClient } = await import("@/lib/auth/auth-client");
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("continueGoogle"));

    await waitFor(() => {
      expect(authClient.signIn.social).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: "/en/recipes",
      });
    });
    expect(requestDeviceAuthorization).not.toHaveBeenCalled();
  });

  it("uses device authorization in a standalone PWA", async () => {
    isStandalonePwa.mockReturnValue(true);
    requestDeviceAuthorization.mockResolvedValue({
      deviceCode: "device-code",
      userCode: "ABCD",
      verificationUrl: "https://auth.example/device",
      expiresAt: Date.now() + 300_000,
      intervalMs: 5_000,
    });
    pollDeviceAuthorization.mockResolvedValue({
      status: "authenticated",
      accessToken: "access-token",
    });
    render(<LoginView locale="uk" />);

    fireEvent.click(screen.getByText("continueGoogle"));

    await waitFor(() => {
      expect(requestDeviceAuthorization).toHaveBeenCalledOnce();
      expect(savePendingDeviceAuth).toHaveBeenCalled();
      expect(establishDeviceSession).toHaveBeenCalledWith(
        expect.anything(),
        "access-token",
      );
      expect(completeDeviceSignIn).toHaveBeenCalledWith("/uk/recipes");
    });
  });

  it("resumes a pending device flow on mount (after a PWA reload)", async () => {
    isStandalonePwa.mockReturnValue(true);
    loadPendingDeviceAuth.mockReturnValue({
      deviceCode: "device-code",
      userCode: "ABCD",
      verificationUrl: "https://auth.example/device",
      expiresAt: Date.now() + 300_000,
      intervalMs: 5_000,
    });
    pollDeviceAuthorization.mockResolvedValue({
      status: "authenticated",
      accessToken: "access-token",
    });

    render(<LoginView locale="uk" />);

    await waitFor(() => {
      expect(pollDeviceAuthorization).toHaveBeenCalled();
      expect(establishDeviceSession).toHaveBeenCalledWith(
        expect.anything(),
        "access-token",
      );
      expect(completeDeviceSignIn).toHaveBeenCalledWith("/uk/recipes");
    });
    expect(requestDeviceAuthorization).not.toHaveBeenCalled();
  });

  it("aborts standalone polling when cancelled", async () => {
    isStandalonePwa.mockReturnValue(true);
    requestDeviceAuthorization.mockResolvedValue({
      deviceCode: "device-code",
      userCode: "ABCD",
      verificationUrl: "https://auth.example/device",
      expiresAt: Date.now() + 300_000,
      intervalMs: 5_000,
    });
    pollDeviceAuthorization.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () =>
            resolve({ status: "cancelled" }),
          );
        }),
    );
    render(<LoginView locale="en" />);
    fireEvent.click(screen.getByText("continueGoogle"));

    fireEvent.click(await screen.findByRole("button", { name: "cancel" }));

    await waitFor(() => {
      expect(screen.getByText("continueGoogle")).toBeVisible();
    });
  });

  it("keeps pending device auth when the login view unmounts during polling", async () => {
    isStandalonePwa.mockReturnValue(true);
    let resolvePolling: ((result: { status: "cancelled" }) => void) | undefined;
    requestDeviceAuthorization.mockResolvedValue({
      deviceCode: "device-code",
      userCode: "ABCD",
      verificationUrl: "https://auth.example/device",
      expiresAt: Date.now() + 300_000,
      intervalMs: 5_000,
    });
    pollDeviceAuthorization.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePolling = resolve;
        }),
    );
    const { unmount } = render(<LoginView locale="en" />);
    fireEvent.click(screen.getByText("continueGoogle"));

    await screen.findByText("waitingForGoogle");
    unmount();
    resolvePolling?.({ status: "cancelled" });
    await Promise.resolve();
    await Promise.resolve();

    expect(clearPendingDeviceAuth).not.toHaveBeenCalled();
  });

  it("hints that passkey needs an existing account", () => {
    render(<LoginView locale="en" />);
    expect(screen.getByText("passkeyHint")).toBeVisible();
  });

  it("tracks login when signing in with Passkey", async () => {
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("continuePasskey"));

    expect(trackEvent).toHaveBeenCalledWith("login", { method: "passkey" });
  });

  it("tracks login when signing in with Telegram", async () => {
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("continueTelegram"));

    expect(trackEvent).toHaveBeenCalledWith("login", { method: "telegram" });
  });
});
