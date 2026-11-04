/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/auth-client", () => ({
  authClient: { signIn: { email: signInEmail } },
}));

import { ReviewSignIn } from "../review-sign-in";

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("ReviewSignIn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs in with email and password and tells the reviewer to go back to Claude", async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<ReviewSignIn />);
    fill("review@example.com", "secret");

    expect(await screen.findByText("Signed in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open RecipAI" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(signInEmail).toHaveBeenCalledWith({
      email: "review@example.com",
      password: "secret",
    });
  });

  it("reports wrong credentials", async () => {
    signInEmail.mockResolvedValue({ data: null, error: { status: 401 } });
    render(<ReviewSignIn />);
    fill("review@example.com", "nope");

    expect(
      await screen.findByText("Wrong email or password."),
    ).toBeInTheDocument();
  });
});
