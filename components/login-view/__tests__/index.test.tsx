/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/telemetry";
import { LoginView } from "../index";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn().mockResolvedValue(undefined),
      passkey: vi.fn().mockResolvedValue({ error: null }),
    },
    signInWithTelegramOIDC: vi.fn().mockResolvedValue(undefined),
  },
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
  it("renders the Google sign-in button", () => {
    render(<LoginView locale="en" />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("tracks login when signing in with Google", async () => {
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("Continue with Google"));

    expect(trackEvent).toHaveBeenCalledWith("login", { method: "google" });
  });

  it("tracks login when signing in with Passkey", async () => {
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("Continue with Passkey"));

    expect(trackEvent).toHaveBeenCalledWith("login", { method: "passkey" });
  });

  it("tracks login when signing in with Telegram", async () => {
    render(<LoginView locale="en" />);

    fireEvent.click(screen.getByText("Continue with Telegram"));

    expect(trackEvent).toHaveBeenCalledWith("login", { method: "telegram" });
  });
});
